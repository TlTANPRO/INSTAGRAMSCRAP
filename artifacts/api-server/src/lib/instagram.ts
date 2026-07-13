import { logger } from "./logger";

const ENSEMBLE_BASE_URL = "https://ensembledata.com/apis/ig";

export class InstagramNotFoundError extends Error {
  constructor(username: string) {
    super(`Instagram account "${username}" not found`);
    this.name = "InstagramNotFoundError";
  }
}

export class InstagramUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramUpstreamError";
  }
}

export interface NormalizedInstagramProfile {
  username: string;
  fullName: string;
  profilePicUrl: string;
  biography: string;
  verified: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  externalUrl: string;
}

export interface NormalizedInstagramPost {
  id: string;
  caption: string;
  createTime: number;
  thumbnailUrl: string;
  postUrl: string;
  mediaType: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  saveCount: number;
  durationSeconds: number;
}

/**
 * Extracts a bare Instagram username from either a raw handle ("@user" / "user")
 * or a full profile URL (e.g. https://www.instagram.com/user/?hl=id).
 */
export function parseInstagramUsername(rawInput: string): string {
  const trimmed = rawInput.trim();
  let candidate = trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const match = url.pathname.match(/\/([^/]+)/);
      if (match?.[1]) {
        candidate = match[1];
      }
    } catch {
      // fall through
    }
  }

  candidate = candidate.replace(/^@/, "").trim();
  return candidate;
}

function getApiToken(): string {
  const token = process.env.ENSEMBLEDATA_API_TOKEN;
  if (!token) {
    throw new InstagramUpstreamError(
      "ENSEMBLEDATA_API_TOKEN is not configured on the server",
    );
  }
  return token;
}

async function ensembleGet(path: string, params: Record<string, string>) {
  const token = getApiToken();
  const query = new URLSearchParams({ ...params, token });
  const url = `${ENSEMBLE_BASE_URL}${path}?${query.toString()}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    logger.error({ err, path }, "Failed to reach EnsembleData Instagram API");
    throw new InstagramUpstreamError(
      "Failed to reach the Instagram data provider",
    );
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new InstagramNotFoundError(params.username ?? params.user_id ?? "unknown");
    }
    logger.error(
      { status: res.status, path },
      "EnsembleData Instagram API returned an error status",
    );
    throw new InstagramUpstreamError(
      `Instagram data provider returned status ${res.status}`,
    );
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err) {
    logger.error({ err, path }, "Failed to parse EnsembleData Instagram response");
    throw new InstagramUpstreamError(
      "Received an invalid response from the Instagram data provider",
    );
  }

  return json as { data: unknown };
}

/** Number of pagination pages to fetch. Each depth yields ~12 posts. */
export const SCRAPE_DEPTH = 8;

export async function fetchInstagramProfile(
  username: string,
): Promise<NormalizedInstagramProfile> {
  const result = await ensembleGet("/user/info", { username });
  const data = result.data as Record<string, unknown> | null;

  if (!data) {
    throw new InstagramNotFoundError(username);
  }

  // EnsembleData wraps the Instagram user object differently depending on endpoint version
  // Try multiple shapes
  const user = (data.user ?? data) as Record<string, unknown>;

  if (!user || !user.username) {
    throw new InstagramNotFoundError(username);
  }

  const edge_followed_by = user.edge_followed_by as { count?: number } | undefined;
  const edge_follow = user.edge_follow as { count?: number } | undefined;
  const edge_owner_to_timeline_media = user.edge_owner_to_timeline_media as { count?: number } | undefined;

  return {
    username: String(user.username ?? username),
    fullName: String(user.full_name ?? user.fullName ?? ""),
    profilePicUrl: String(user.profile_pic_url_hd ?? user.profile_pic_url ?? user.profilePicUrl ?? ""),
    biography: String(user.biography ?? user.bio ?? ""),
    verified: Boolean(user.is_verified ?? user.verified ?? false),
    followerCount: Number(
      edge_followed_by?.count ??
      user.follower_count ??
      user.followerCount ??
      0,
    ),
    followingCount: Number(
      edge_follow?.count ??
      user.following_count ??
      user.followingCount ??
      0,
    ),
    postCount: Number(
      edge_owner_to_timeline_media?.count ??
      user.media_count ??
      user.postCount ??
      0,
    ),
    externalUrl: String(user.external_url ?? user.externalUrl ?? ""),
  };
}

function extractThumbnail(post: Record<string, unknown>): string {
  // Try multiple thumbnail fields
  const displayUrl = post.display_url ?? post.displayUrl;
  if (typeof displayUrl === "string" && displayUrl.length > 0) return displayUrl;

  const thumbnailSrc = post.thumbnail_src ?? post.thumbnailUrl;
  if (typeof thumbnailSrc === "string" && thumbnailSrc.length > 0) return thumbnailSrc;

  const resources = post.thumbnail_resources as Array<{ src: string }> | undefined;
  if (resources && resources.length > 0) {
    const last = resources[resources.length - 1];
    if (last?.src) return last.src;
  }

  const imageVersions = post.image_versions2 as { candidates?: Array<{ url: string }> } | undefined;
  if (imageVersions?.candidates?.[0]?.url) return imageVersions.candidates[0].url;

  return "";
}

function extractViewCount(post: Record<string, unknown>): number {
  const videoViewCount = post.video_view_count ?? post.videoViewCount;
  if (typeof videoViewCount === "number") return videoViewCount;

  const viewCount = post.view_count ?? post.viewCount;
  if (typeof viewCount === "number") return viewCount;

  const videoPlayCount = post.video_play_count ?? post.playCount;
  if (typeof videoPlayCount === "number") return videoPlayCount;

  return 0;
}

function extractMediaType(post: Record<string, unknown>): string {
  const mediaType = post.media_type ?? post.mediaType;
  if (typeof mediaType === "number") {
    // Instagram API media_type numbers: 1=IMAGE, 2=VIDEO, 8=CAROUSEL_ALBUM
    switch (mediaType) {
      case 1: return "IMAGE";
      case 2: return post.product_type === "clips" ? "REEL" : "VIDEO";
      case 8: return "CAROUSEL_ALBUM";
    }
  }
  if (typeof mediaType === "string") return mediaType.toUpperCase();

  const isVideo = post.is_video ?? post.isVideo;
  if (isVideo === true) return "VIDEO";

  return "IMAGE";
}

function extractDuration(post: Record<string, unknown>): number {
  const duration = post.video_duration ?? post.videoDuration ?? post.duration;
  if (typeof duration === "number") return duration;
  return 0;
}

function normalizePost(post: Record<string, unknown>, username: string): NormalizedInstagramPost {
  const id = String(post.id ?? post.pk ?? post.shortcode ?? "");
  const shortcode = post.shortcode ?? post.code ?? id;

  const edgeLikes = post.edge_liked_by as { count?: number } | undefined;
  const edgeComments = post.edge_media_to_comment as { count?: number } | undefined;

  const likeCount = Number(
    edgeLikes?.count ??
    post.like_count ??
    post.likeCount ??
    0,
  );
  const commentCount = Number(
    edgeComments?.count ??
    post.comment_count ??
    post.commentCount ??
    0,
  );

  let caption = "";
  const captionRaw = post.caption ?? post.accessibility_caption;
  if (typeof captionRaw === "string") {
    caption = captionRaw;
  } else if (captionRaw && typeof captionRaw === "object") {
    const captionObj = captionRaw as Record<string, unknown>;
    caption = String(captionObj.text ?? "");
  } else {
    const edgeCaption = post.edge_media_to_caption as {
      edges?: Array<{ node: { text: string } }>;
    } | undefined;
    caption = edgeCaption?.edges?.[0]?.node?.text ?? "";
  }

  const createTime = Number(
    post.taken_at ??
    post.taken_at_timestamp ??
    post.timestamp ??
    post.createTime ??
    0,
  );

  return {
    id,
    caption,
    createTime,
    thumbnailUrl: extractThumbnail(post),
    postUrl: `https://www.instagram.com/p/${shortcode}/`,
    mediaType: extractMediaType(post),
    likeCount,
    commentCount,
    viewCount: extractViewCount(post),
    saveCount: Number(post.saved_count ?? post.save_count ?? post.saveCount ?? 0),
    durationSeconds: extractDuration(post),
  };
}

export async function fetchInstagramPosts(
  username: string,
  depth = 1,
): Promise<{
  posts: NormalizedInstagramPost[];
  authorStatsOverride: Partial<NormalizedInstagramProfile>;
}> {
  const result = await ensembleGet("/user/posts", {
    username,
    depth: String(depth),
  });

  const data = result.data as Record<string, unknown> | null;
  if (!data) return { posts: [], authorStatsOverride: {} };

  // Data may be an array or an object with items/edges
  let rawPosts: Record<string, unknown>[] = [];

  if (Array.isArray(data)) {
    rawPosts = data as Record<string, unknown>[];
  } else {
    // Could be { items: [...] } or { edges: [...] } or an object of posts
    const items = data.items ?? data.edges ?? data.posts;
    if (Array.isArray(items)) {
      rawPosts = items.map((item: unknown) => {
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          return (obj.node ?? obj) as Record<string, unknown>;
        }
        return {};
      });
    } else {
      // Fallback: treat object values as posts
      rawPosts = Object.values(data).filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && ("id" in item || "pk" in item || "shortcode" in item),
      );
    }
  }

  const posts = rawPosts.map((post) => normalizePost(post, username));

  // Try to extract updated author stats from the first post
  const authorStatsOverride: Partial<NormalizedInstagramProfile> = {};
  const firstPost = rawPosts[0];
  if (firstPost) {
    const owner = firstPost.owner as Record<string, unknown> | undefined;
    if (owner) {
      const edgeFollowedBy = owner.edge_followed_by as { count?: number } | undefined;
      if (typeof edgeFollowedBy?.count === "number") {
        authorStatsOverride.followerCount = edgeFollowedBy.count;
      }
      if (typeof owner.media_count === "number") {
        authorStatsOverride.postCount = owner.media_count;
      }
    }
  }

  return { posts, authorStatsOverride };
}

// ---------------------------------------------------------------------------
// Analytics computation
// ---------------------------------------------------------------------------

export interface InstagramAggregates {
  totalPostsAnalyzed: number;
  totalLikeCount: number;
  totalCommentCount: number;
  totalViewCount: number;
  totalSaveCount: number;
  avgLikeCount: number;
  avgCommentCount: number;
  avgViewCount: number;
  avgSaveCount: number;
  engagementRate: number;
  postsPerWeek: number;
  mostViewedPostId: string | null;
  mostLikedPostId: string | null;
}

export function computeAggregates(
  posts: NormalizedInstagramPost[],
  followerCount: number,
): InstagramAggregates {
  const totalPostsAnalyzed = posts.length;

  if (totalPostsAnalyzed === 0) {
    return {
      totalPostsAnalyzed: 0,
      totalLikeCount: 0,
      totalCommentCount: 0,
      totalViewCount: 0,
      totalSaveCount: 0,
      avgLikeCount: 0,
      avgCommentCount: 0,
      avgViewCount: 0,
      avgSaveCount: 0,
      engagementRate: 0,
      postsPerWeek: 0,
      mostViewedPostId: null,
      mostLikedPostId: null,
    };
  }

  const totalLikeCount = posts.reduce((sum, p) => sum + p.likeCount, 0);
  const totalCommentCount = posts.reduce((sum, p) => sum + p.commentCount, 0);
  const totalViewCount = posts.reduce((sum, p) => sum + p.viewCount, 0);
  const totalSaveCount = posts.reduce((sum, p) => sum + p.saveCount, 0);

  const avgLikeCount = totalLikeCount / totalPostsAnalyzed;
  const avgCommentCount = totalCommentCount / totalPostsAnalyzed;
  const avgViewCount = totalViewCount / totalPostsAnalyzed;
  const avgSaveCount = totalSaveCount / totalPostsAnalyzed;

  // Instagram engagement rate: (likes + comments + saves) / followers * 100
  const engagementRate =
    followerCount > 0
      ? ((avgLikeCount + avgCommentCount + avgSaveCount) / followerCount) * 100
      : 0;

  const createTimes = posts
    .map((p) => p.createTime)
    .filter((t) => t > 0)
    .sort((a, b) => a - b);

  let postsPerWeek = 0;
  if (createTimes.length > 1) {
    const spanSeconds =
      createTimes[createTimes.length - 1]! - createTimes[0]!;
    const spanWeeks = spanSeconds / (60 * 60 * 24 * 7);
    postsPerWeek =
      spanWeeks > 0 ? totalPostsAnalyzed / spanWeeks : totalPostsAnalyzed;
  }

  const mostViewed = posts.reduce((best, p) =>
    p.viewCount > best.viewCount ? p : best,
  );
  const mostLiked = posts.reduce((best, p) =>
    p.likeCount > best.likeCount ? p : best,
  );

  return {
    totalPostsAnalyzed,
    totalLikeCount,
    totalCommentCount,
    totalViewCount,
    totalSaveCount,
    avgLikeCount,
    avgCommentCount,
    avgViewCount,
    avgSaveCount,
    engagementRate,
    postsPerWeek,
    mostViewedPostId: mostViewed.id || null,
    mostLikedPostId: mostLiked.id || null,
  };
}

// ---------------------------------------------------------------------------
// Deep insights
// ---------------------------------------------------------------------------

export interface PerformanceTierCounts {
  viral: number;
  tinggi: number;
  bagus: number;
  rataRata: number;
  rendah: number;
}

export interface HashtagStat {
  tag: string;
  count: number;
}

export interface MentionStat {
  mention: string;
  count: number;
}

export interface DayOfWeekStat {
  day: string;
  postCount: number;
  avgLikeCount: number;
  avgCommentCount: number;
  avgViewCount: number;
}

export interface MonthlyStat {
  month: string;
  postCount: number;
  totalLikeCount: number;
  avgLikeCount: number;
  avgEngagementRate: number;
}

export interface DurationBucketStat {
  bucket: string;
  postCount: number;
  avgViewCount: number;
  avgEngagementRate: number;
}

export interface YearlyStat {
  year: string;
  postCount: number;
  totalLikeCount: number;
  totalCommentCount: number;
  avgEngagementRate: number;
}

export interface MarketInsights {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface IndustryBenchmark {
  engagementRateBenchmark: number;
  engagementRateComparison: "above" | "average" | "below";
  likesPerFollowerBenchmark: number;
  accountLikesPerFollower: number;
  likesPerFollowerComparison: "above" | "average" | "below";
  postingFrequencyBenchmark: number;
  postingFrequencyComparison: "above" | "average" | "below";
}

export interface GrowthPotential {
  score: number;
  label: "rendah" | "sedang" | "tinggi";
  reasoning: string;
}

export interface InstagramAnalysisInsights {
  topByViews: NormalizedInstagramPost[];
  topByLikes: NormalizedInstagramPost[];
  topByComments: NormalizedInstagramPost[];
  performanceTiers: PerformanceTierCounts;
  topHashtags: HashtagStat[];
  topMentions: MentionStat[];
  performanceByDayOfWeek: DayOfWeekStat[];
  performanceByMonth: MonthlyStat[];
  durationAnalysis: DurationBucketStat[];
  yearlySummary: YearlyStat[];
  marketInsights: MarketInsights;
  industryBenchmark: IndustryBenchmark;
  growthPotential: GrowthPotential;
}

const DAY_NAMES_ID = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu",
];

function topN(
  posts: NormalizedInstagramPost[],
  key: "viewCount" | "likeCount" | "commentCount",
  n: number,
): NormalizedInstagramPost[] {
  return [...posts].sort((a, b) => b[key] - a[key]).slice(0, n);
}

function classifyTiers(posts: NormalizedInstagramPost[]): PerformanceTierCounts {
  const counts: PerformanceTierCounts = {
    viral: 0, tinggi: 0, bagus: 0, rataRata: 0, rendah: 0,
  };
  if (posts.length === 0) return counts;

  const avgLikes = posts.reduce((sum, p) => sum + p.likeCount, 0) / posts.length;
  if (avgLikes === 0) {
    counts.rendah = posts.length;
    return counts;
  }

  for (const p of posts) {
    const ratio = p.likeCount / avgLikes;
    if (ratio >= 3) counts.viral += 1;
    else if (ratio >= 1.5) counts.tinggi += 1;
    else if (ratio >= 0.75) counts.bagus += 1;
    else if (ratio >= 0.3) counts.rataRata += 1;
    else counts.rendah += 1;
  }
  return counts;
}

function extractHashtags(posts: NormalizedInstagramPost[]): HashtagStat[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    const matches = p.caption.match(/#[\p{L}\p{N}_]+/gu) ?? [];
    for (const raw of matches) {
      const tag = raw.toLowerCase();
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function extractMentions(posts: NormalizedInstagramPost[]): MentionStat[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    const matches = p.caption.match(/@[\w.]+/g) ?? [];
    for (const raw of matches) {
      const mention = raw.toLowerCase();
      counts.set(mention, (counts.get(mention) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([mention, count]) => ({ mention, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function computeDayOfWeek(posts: NormalizedInstagramPost[]): DayOfWeekStat[] {
  const buckets = new Map<number, { postCount: number; likes: number; comments: number; views: number }>();
  for (const p of posts) {
    if (!p.createTime) continue;
    const day = new Date(p.createTime * 1000).getUTCDay();
    const b = buckets.get(day) ?? { postCount: 0, likes: 0, comments: 0, views: 0 };
    b.postCount += 1;
    b.likes += p.likeCount;
    b.comments += p.commentCount;
    b.views += p.viewCount;
    buckets.set(day, b);
  }
  return DAY_NAMES_ID.map((day, idx) => {
    const b = buckets.get(idx);
    if (!b || b.postCount === 0) {
      return { day, postCount: 0, avgLikeCount: 0, avgCommentCount: 0, avgViewCount: 0 };
    }
    return {
      day,
      postCount: b.postCount,
      avgLikeCount: b.likes / b.postCount,
      avgCommentCount: b.comments / b.postCount,
      avgViewCount: b.views / b.postCount,
    };
  });
}

function computeMonthly(posts: NormalizedInstagramPost[], followerCount: number): MonthlyStat[] {
  const buckets = new Map<string, { postCount: number; likes: number; comments: number; saves: number }>();
  for (const p of posts) {
    if (!p.createTime) continue;
    const d = new Date(p.createTime * 1000);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    const b = buckets.get(month) ?? { postCount: 0, likes: 0, comments: 0, saves: 0 };
    b.postCount += 1;
    b.likes += p.likeCount;
    b.comments += p.commentCount;
    b.saves += p.saveCount;
    buckets.set(month, b);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, b]) => {
      const avgLike = b.postCount > 0 ? b.likes / b.postCount : 0;
      const avgComment = b.postCount > 0 ? b.comments / b.postCount : 0;
      const avgSave = b.postCount > 0 ? b.saves / b.postCount : 0;
      const er = followerCount > 0 ? ((avgLike + avgComment + avgSave) / followerCount) * 100 : 0;
      return {
        month,
        postCount: b.postCount,
        totalLikeCount: b.likes,
        avgLikeCount: avgLike,
        avgEngagementRate: er,
      };
    });
}

function computeDurationBuckets(posts: NormalizedInstagramPost[], followerCount: number): DurationBucketStat[] {
  const definitions: { bucket: string; test: (p: NormalizedInstagramPost) => boolean }[] = [
    { bucket: "Foto / Carousel", test: (p) => p.mediaType === "IMAGE" || p.mediaType === "CAROUSEL_ALBUM" },
    { bucket: "< 15 detik", test: (p) => (p.mediaType === "VIDEO" || p.mediaType === "REEL") && p.durationSeconds > 0 && p.durationSeconds < 15 },
    { bucket: "15 - 30 detik", test: (p) => (p.mediaType === "VIDEO" || p.mediaType === "REEL") && p.durationSeconds >= 15 && p.durationSeconds < 30 },
    { bucket: "30 - 60 detik", test: (p) => (p.mediaType === "VIDEO" || p.mediaType === "REEL") && p.durationSeconds >= 30 && p.durationSeconds < 60 },
    { bucket: "> 60 detik", test: (p) => (p.mediaType === "VIDEO" || p.mediaType === "REEL") && p.durationSeconds >= 60 },
  ];

  return definitions.map(({ bucket, test }) => {
    const matching = posts.filter(test);
    if (matching.length === 0) return { bucket, postCount: 0, avgViewCount: 0, avgEngagementRate: 0 };
    const totalViews = matching.reduce((sum, p) => sum + p.viewCount, 0);
    const avgLike = matching.reduce((sum, p) => sum + p.likeCount, 0) / matching.length;
    const avgComment = matching.reduce((sum, p) => sum + p.commentCount, 0) / matching.length;
    const avgSave = matching.reduce((sum, p) => sum + p.saveCount, 0) / matching.length;
    const er = followerCount > 0 ? ((avgLike + avgComment + avgSave) / followerCount) * 100 : 0;
    return {
      bucket,
      postCount: matching.length,
      avgViewCount: totalViews / matching.length,
      avgEngagementRate: er,
    };
  });
}

function computeYearlySummary(posts: NormalizedInstagramPost[]): YearlyStat[] {
  const buckets = new Map<string, { postCount: number; likes: number; comments: number; saves: number; followers: number }>();
  for (const p of posts) {
    if (!p.createTime) continue;
    const year = String(new Date(p.createTime * 1000).getUTCFullYear());
    const b = buckets.get(year) ?? { postCount: 0, likes: 0, comments: 0, saves: 0, followers: 0 };
    b.postCount += 1;
    b.likes += p.likeCount;
    b.comments += p.commentCount;
    b.saves += p.saveCount;
    buckets.set(year, b);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([year, b]) => ({
      year,
      postCount: b.postCount,
      totalLikeCount: b.likes,
      totalCommentCount: b.comments,
      avgEngagementRate: 0, // calculated using followerCount at route level
    }));
}

// Instagram industry benchmarks
const INDUSTRY_ENGAGEMENT_RATE_BENCHMARK = 3.0; // %
const INDUSTRY_LIKES_PER_FOLLOWER_BENCHMARK = 0.02; // avg likes / follower per post
const INDUSTRY_POSTING_FREQUENCY_BENCHMARK = 4; // posts/week

function compareToBenchmark(
  value: number,
  benchmark: number,
  tolerance = 0.1,
): "above" | "average" | "below" {
  if (value >= benchmark * (1 + tolerance)) return "above";
  if (value <= benchmark * (1 - tolerance)) return "below";
  return "average";
}

function computeIndustryBenchmark(
  aggregates: InstagramAggregates,
  followerCount: number,
): IndustryBenchmark {
  const accountLikesPerFollower =
    followerCount > 0 ? aggregates.avgLikeCount / followerCount : 0;

  return {
    engagementRateBenchmark: INDUSTRY_ENGAGEMENT_RATE_BENCHMARK,
    engagementRateComparison: compareToBenchmark(
      aggregates.engagementRate,
      INDUSTRY_ENGAGEMENT_RATE_BENCHMARK,
    ),
    likesPerFollowerBenchmark: INDUSTRY_LIKES_PER_FOLLOWER_BENCHMARK,
    accountLikesPerFollower,
    likesPerFollowerComparison: compareToBenchmark(
      accountLikesPerFollower,
      INDUSTRY_LIKES_PER_FOLLOWER_BENCHMARK,
    ),
    postingFrequencyBenchmark: INDUSTRY_POSTING_FREQUENCY_BENCHMARK,
    postingFrequencyComparison: compareToBenchmark(
      aggregates.postsPerWeek,
      INDUSTRY_POSTING_FREQUENCY_BENCHMARK,
    ),
  };
}

function computeMarketInsights(
  aggregates: InstagramAggregates,
  benchmark: IndustryBenchmark,
  tiers: PerformanceTierCounts,
  profile: NormalizedInstagramProfile,
): MarketInsights {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (benchmark.engagementRateComparison === "above") {
    strengths.push(
      `Engagement rate ${aggregates.engagementRate.toFixed(2)}% berada di atas rata-rata industri Instagram (${benchmark.engagementRateBenchmark}%), menandakan audiens sangat aktif berinteraksi.`,
    );
  } else if (benchmark.engagementRateComparison === "below") {
    weaknesses.push(
      `Engagement rate ${aggregates.engagementRate.toFixed(2)}% masih di bawah rata-rata industri Instagram (${benchmark.engagementRateBenchmark}%).`,
    );
    recommendations.push(
      "Tingkatkan interaksi dengan menambahkan pertanyaan di caption, membalas komentar, membuat Instagram Stories/Polls, dan menggunakan Reels untuk menjangkau audiens baru.",
    );
  }

  if (benchmark.postingFrequencyComparison === "above") {
    strengths.push(
      `Frekuensi posting ${aggregates.postsPerWeek.toFixed(1)}x/minggu sangat konsisten, di atas standar industri (${benchmark.postingFrequencyBenchmark}x/minggu).`,
    );
  } else if (benchmark.postingFrequencyComparison === "below") {
    weaknesses.push(
      `Frekuensi posting ${aggregates.postsPerWeek.toFixed(1)}x/minggu masih rendah dibanding standar industri (${benchmark.postingFrequencyBenchmark}x/minggu).`,
    );
    recommendations.push(
      "Tingkatkan konsistensi posting minimal 4x per minggu, kombinasikan konten feed (foto/carousel), Reels, dan Stories agar algoritma Instagram lebih sering mendistribusikan konten.",
    );
  }

  const viralAndHigh = tiers.viral + tiers.tinggi;
  const total = tiers.viral + tiers.tinggi + tiers.bagus + tiers.rataRata + tiers.rendah;
  if (total > 0 && viralAndHigh / total >= 0.3) {
    strengths.push(
      `${viralAndHigh} dari ${total} post termasuk kategori performa tinggi/viral, menunjukkan formula konten yang bekerja baik.`,
    );
  }
  if (total > 0 && tiers.rendah / total >= 0.4) {
    weaknesses.push(
      `${tiers.rendah} dari ${total} post termasuk kategori performa rendah, menandakan konsistensi kualitas konten masih perlu ditingkatkan.`,
    );
    recommendations.push(
      "Pelajari pola dari post dengan performa tertinggi (topik, format, caption, waktu posting) dan replikasi pola tersebut secara konsisten.",
    );
  }

  if (benchmark.likesPerFollowerComparison === "below") {
    weaknesses.push(
      "Rata-rata likes per follower tergolong rendah, artinya banyak followers yang tidak aktif berinteraksi dengan konten terbaru.",
    );
    recommendations.push(
      "Coba variasikan format konten: carousel cenderung mendapat engagement lebih tinggi di Instagram, dan Reels memiliki jangkauan organik yang lebih besar daripada foto biasa.",
    );
  } else if (benchmark.likesPerFollowerComparison === "above") {
    strengths.push(
      "Rata-rata likes per follower tinggi, menandakan followers sangat aktif dan konten relevan dengan audiens.",
    );
  }

  if (profile.postCount > 0 && aggregates.totalPostsAnalyzed > 0) {
    recommendations.push(
      "Lakukan analisis ulang secara berkala (setiap bulan) untuk memantau tren performa, pertumbuhan followers, dan efektivitas strategi konten dari waktu ke waktu.",
    );
  }

  if (aggregates.totalViewCount > 0) {
    const videoRatio = aggregates.avgViewCount > aggregates.avgLikeCount * 5 ? true : false;
    if (videoRatio) {
      strengths.push("Konten video/Reels mendapat tayangan signifikan, menunjukkan potensi besar distribusi organik melalui algoritma Explore Instagram.");
    } else {
      recommendations.push("Tambahkan lebih banyak konten Reels karena Instagram secara aktif mendistribusikan video ke halaman Explore, yang dapat meningkatkan jangkauan ke audiens baru.");
    }
  } else {
    recommendations.push("Mulai eksplorasi format Reels untuk meningkatkan jangkauan organik. Video pendek 15-30 detik memiliki peluang viral yang lebih tinggi di Instagram saat ini.");
  }

  if (strengths.length === 0) {
    strengths.push("Akun memiliki data performa yang cukup untuk dianalisis lebih lanjut demi menemukan pola konten yang berhasil.");
  }
  if (weaknesses.length === 0) {
    weaknesses.push("Tidak ditemukan kelemahan signifikan pada sampel post yang dianalisis saat ini.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Pertahankan strategi konten saat ini dan terus pantau metrik performa secara berkala.");
  }

  return { strengths, weaknesses, recommendations };
}

function computeGrowthPotential(
  aggregates: InstagramAggregates,
  benchmark: IndustryBenchmark,
  tiers: PerformanceTierCounts,
): GrowthPotential {
  let score = 40;

  if (benchmark.engagementRateComparison === "above") score += 20;
  else if (benchmark.engagementRateComparison === "below") score -= 10;

  if (benchmark.postingFrequencyComparison === "above") score += 15;
  else if (benchmark.postingFrequencyComparison === "below") score -= 10;

  if (benchmark.likesPerFollowerComparison === "above") score += 15;
  else if (benchmark.likesPerFollowerComparison === "below") score -= 5;

  const total = tiers.viral + tiers.tinggi + tiers.bagus + tiers.rataRata + tiers.rendah;
  if (total > 0) {
    score += Math.round(((tiers.viral + tiers.tinggi) / total) * 20);
  }

  score = Math.max(0, Math.min(100, score));
  const label: GrowthPotential["label"] =
    score >= 70 ? "tinggi" : score >= 40 ? "sedang" : "rendah";

  const reasoning =
    label === "tinggi"
      ? "Kombinasi engagement rate, konsistensi posting, dan proporsi post berperforma tinggi menunjukkan momentum pertumbuhan yang kuat di Instagram."
      : label === "sedang"
        ? "Ada sinyal pertumbuhan positif, namun beberapa metrik (engagement, konsistensi posting, atau reach) masih bisa dioptimalkan."
        : "Beberapa metrik kunci berada di bawah standar industri Instagram, sehingga pertumbuhan organik cenderung lambat tanpa perubahan strategi konten.";

  return { score, label, reasoning };
}

export function computeInsights(
  posts: NormalizedInstagramPost[],
  aggregates: InstagramAggregates,
  profile: NormalizedInstagramProfile,
): InstagramAnalysisInsights {
  const tiers = classifyTiers(posts);
  const benchmark = computeIndustryBenchmark(aggregates, profile.followerCount);
  const yearlySummary = computeYearlySummary(posts).map((y) => ({
    ...y,
    avgEngagementRate:
      profile.followerCount > 0 && y.postCount > 0
        ? ((y.totalLikeCount / y.postCount + y.totalCommentCount / y.postCount) /
            profile.followerCount) *
          100
        : 0,
  }));

  return {
    topByViews: topN(posts, "viewCount", 5),
    topByLikes: topN(posts, "likeCount", 5),
    topByComments: topN(posts, "commentCount", 5),
    performanceTiers: tiers,
    topHashtags: extractHashtags(posts),
    topMentions: extractMentions(posts),
    performanceByDayOfWeek: computeDayOfWeek(posts),
    performanceByMonth: computeMonthly(posts, profile.followerCount),
    durationAnalysis: computeDurationBuckets(posts, profile.followerCount),
    yearlySummary,
    marketInsights: computeMarketInsights(aggregates, benchmark, tiers, profile),
    industryBenchmark: benchmark,
    growthPotential: computeGrowthPotential(aggregates, benchmark, tiers),
  };
}
