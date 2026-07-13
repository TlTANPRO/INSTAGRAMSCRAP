import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, instagramAnalysesTable } from "@workspace/db";
import {
  CreateInstagramAnalysisBody,
  CreateInstagramAnalysisResponse,
  GetInstagramAnalysisParams,
  GetInstagramAnalysisResponse,
  DeleteInstagramAnalysisParams,
  ListInstagramAnalysesResponse,
} from "@workspace/api-zod";
import {
  parseInstagramUsername,
  fetchInstagramProfile,
  fetchInstagramPosts,
  computeAggregates,
  computeInsights,
  SCRAPE_DEPTH,
  InstagramNotFoundError,
  InstagramUpstreamError,
} from "../lib/instagram";

const router: IRouter = Router();

async function rowToAnalysis(row: typeof instagramAnalysesTable.$inferSelect) {
  const history = await db
    .select({
      createdAt: instagramAnalysesTable.createdAt,
      followerCount: instagramAnalysesTable.followerCount,
      postCount: instagramAnalysesTable.postCount,
    })
    .from(instagramAnalysesTable)
    .where(eq(instagramAnalysesTable.username, row.username))
    .orderBy(instagramAnalysesTable.createdAt);

  return {
    id: row.id,
    input: row.input,
    profile: row.profile,
    posts: row.posts,
    aggregates: row.aggregates,
    insights: row.insights,
    growthHistory: history.map((h) => ({
      date: h.createdAt.toISOString(),
      followerCount: h.followerCount,
      postCount: h.postCount,
    })),
    createdAt: row.createdAt.toISOString(),
  };
}

router.get("/instagram/analyses", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(instagramAnalysesTable)
    .orderBy(desc(instagramAnalysesTable.createdAt));

  const summaries = rows.map((row) => ({
    id: row.id,
    input: row.input,
    username: row.username,
    fullName: row.fullName,
    profilePicUrl: row.profilePicUrl,
    followerCount: row.followerCount,
    postCount: row.postCount,
    createdAt: row.createdAt.toISOString(),
  }));

  res.json(ListInstagramAnalysesResponse.parse(summaries));
});

router.post("/instagram/analyses", async (req, res): Promise<void> => {
  const parsed = CreateInstagramAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const username = parseInstagramUsername(parsed.data.input);
  if (!username) {
    res.status(400).json({ error: "Nama pengguna Instagram tidak valid" });
    return;
  }

  try {
    const profile = await fetchInstagramProfile(username);
    const { posts, authorStatsOverride } = await fetchInstagramPosts(
      profile.userId,
      SCRAPE_DEPTH,
    );
    const mergedProfile = { ...profile, ...authorStatsOverride };
    const aggregates = computeAggregates(posts, mergedProfile.followerCount);
    const insights = computeInsights(posts, aggregates, mergedProfile);

    const [row] = await db
      .insert(instagramAnalysesTable)
      .values({
        input: parsed.data.input,
        username: mergedProfile.username,
        fullName: mergedProfile.fullName,
        profilePicUrl: mergedProfile.profilePicUrl,
        followerCount: mergedProfile.followerCount,
        postCount: mergedProfile.postCount,
        profile: mergedProfile,
        posts,
        aggregates,
        insights,
      })
      .returning();

    if (!row) {
      res.status(502).json({ error: "Gagal menyimpan hasil analisis" });
      return;
    }

    res
      .status(201)
      .json(CreateInstagramAnalysisResponse.parse(await rowToAnalysis(row)));
  } catch (err) {
    if (err instanceof InstagramNotFoundError) {
      req.log.warn({ username }, "Instagram account not found");
      res.status(404).json({ error: "Akun Instagram tidak ditemukan" });
      return;
    }
    if (err instanceof InstagramUpstreamError) {
      req.log.error({ err, username }, "Instagram upstream error");
      res
        .status(502)
        .json({ error: "Gagal mengambil data dari penyedia data Instagram" });
      return;
    }
    throw err;
  }
});

router.get("/instagram/analyses/:id", async (req, res): Promise<void> => {
  const params = GetInstagramAnalysisParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select()
    .from(instagramAnalysesTable)
    .where(eq(instagramAnalysesTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Analisis tidak ditemukan" });
    return;
  }

  res.json(GetInstagramAnalysisResponse.parse(await rowToAnalysis(row)));
});

router.delete("/instagram/analyses/:id", async (req, res): Promise<void> => {
  const params = DeleteInstagramAnalysisParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .delete(instagramAnalysesTable)
    .where(eq(instagramAnalysesTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Analisis tidak ditemukan" });
    return;
  }

  res.sendStatus(204);
});

export default router;
