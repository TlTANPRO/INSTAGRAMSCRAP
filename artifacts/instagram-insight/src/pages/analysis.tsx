import React from "react";
import { useParams, Link } from "wouter";
import { useGetInstagramAnalysis, getGetInstagramAnalysisQueryKey } from "@workspace/api-client-react";
import { Card, Badge, Avatar, Skeleton, Button } from "@/components/ui";
import { formatNumber, formatPercent, formatDate, cn } from "@/lib/utils";
import { ArrowLeft, ExternalLink, Activity, Image as ImageIcon, Heart, MessageCircle, Eye, Bookmark, TrendingUp, Calendar, Hash, AtSign, Clock, ShieldCheck, CheckCircle2, AlertTriangle, Lightbulb, PlaySquare, PieChart as PieChartIcon } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const TIER_COLORS = {
  viral: "#8b5cf6",
  tinggi: "#10b981",
  bagus: "#3b82f6",
  rataRata: "#f59e0b",
  rendah: "#ef4444",
};

export default function Analysis() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const { data, isLoading, error } = useGetInstagramAnalysis(id, { 
    query: { enabled: !!id, queryKey: getGetInstagramAnalysisQueryKey(id) } 
  });

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground p-4 md:p-8 space-y-6">
        <Skeleton className="h-12 w-32" />
        <Card>
          <div className="flex gap-6 items-center">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="space-y-3 flex-1">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Gagal memuat analisis</h1>
          <p className="text-muted-foreground">Laporan yang Anda tuju mungkin tidak ada atau telah dihapus.</p>
          <Link href="/">
            <Button>Kembali ke Beranda</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { profile, posts, aggregates, insights, growthHistory } = data;

  const performancePieData = [
    { name: "Viral", value: insights.performanceTiers.viral, color: TIER_COLORS.viral },
    { name: "Tinggi", value: insights.performanceTiers.tinggi, color: TIER_COLORS.tinggi },
    { name: "Bagus", value: insights.performanceTiers.bagus, color: TIER_COLORS.bagus },
    { name: "Rata-rata", value: insights.performanceTiers.rataRata, color: TIER_COLORS.rataRata },
    { name: "Rendah", value: insights.performanceTiers.rendah, color: TIER_COLORS.rendah },
  ].filter(d => d.value > 0);

  const potentialColor = insights.growthPotential.label === "tinggi" ? "#10b981" 
    : insights.growthPotential.label === "sedang" ? "#f59e0b" : "#ef4444";

  return (
    <div className="min-h-[100dvh] bg-background text-foreground pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali</span>
          </Link>
          <div className="font-semibold text-sm bg-clip-text text-transparent bg-gradient-to-r from-[#833ab4] to-[#e1306c]">
            Laporan Analisis Instagram
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in">
        
        {/* Section 1 & 2: Profile Header + Potensi Pertumbuhan */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-[#833ab4]/20 via-[#c13584]/20 to-[#e1306c]/20" />
            <div className="relative pt-12 flex flex-col md:flex-row gap-6 items-start">
              <Avatar src={profile.profilePicUrl} fallback={profile.username[0].toUpperCase()} className="w-24 h-24 border-4 border-[#0d0a14] shadow-xl" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{profile.fullName || profile.username}</h1>
                  {profile.verified && <ShieldCheck className="w-5 h-5 text-blue-400" />}
                </div>
                <a href={profile.externalUrl || `https://instagram.com/${profile.username}`} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 mt-1 font-medium w-fit">
                  @{profile.username}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{profile.biography}</p>
                <div className="flex gap-6 mt-6">
                  <div className="flex flex-col"><span className="font-bold text-xl">{formatNumber(profile.postCount)}</span> <span className="text-muted-foreground text-xs uppercase tracking-wider">Post</span></div>
                  <div className="flex flex-col"><span className="font-bold text-xl">{formatNumber(profile.followerCount)}</span> <span className="text-muted-foreground text-xs uppercase tracking-wider">Pengikut</span></div>
                  <div className="flex flex-col"><span className="font-bold text-xl">{formatNumber(profile.followingCount)}</span> <span className="text-muted-foreground text-xs uppercase tracking-wider">Mengikuti</span></div>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Potensi Pertumbuhan */}
          <Card className="flex flex-col items-center justify-center text-center relative overflow-hidden">
            <h3 className="font-semibold mb-4 w-full text-left text-muted-foreground uppercase text-xs tracking-wider">Potensi Pertumbuhan</h3>
            <div className="relative w-48 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { value: insights.growthPotential.score, fill: potentialColor },
                      { value: 100 - insights.growthPotential.score, fill: "#1f2937" }
                    ]}
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={70}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-4xl font-black">
                {insights.growthPotential.score}
              </div>
            </div>
            <Badge variant={insights.growthPotential.label === "tinggi" ? "success" : insights.growthPotential.label === "sedang" ? "warning" : "danger"} className="mt-4 uppercase tracking-widest text-[10px]">
              {insights.growthPotential.label}
            </Badge>
            <p className="text-sm text-muted-foreground mt-4 px-4 leading-relaxed">{insights.growthPotential.reasoning}</p>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Post Dianalisis" value={formatNumber(aggregates.totalPostsAnalyzed)} icon={ImageIcon} />
          <StatCard title="Total Tayangan" value={formatNumber(aggregates.totalViewCount)} icon={Eye} />
          <StatCard title="Total Suka" value={formatNumber(aggregates.totalLikeCount)} icon={Heart} />
          <StatCard title="Total Komentar" value={formatNumber(aggregates.totalCommentCount)} icon={MessageCircle} />
          <StatCard title="Engagement Rate" value={formatPercent(aggregates.engagementRate)} icon={Activity} highlight />
          
          <StatCard title="Rata-rata Tayangan" value={formatNumber(aggregates.avgViewCount)} icon={Eye} />
          <StatCard title="Rata-rata Suka" value={formatNumber(aggregates.avgLikeCount)} icon={Heart} />
          <StatCard title="Rata-rata Komentar" value={formatNumber(aggregates.avgCommentCount)} icon={MessageCircle} />
          <StatCard title="Rata-rata Saves" value={formatNumber(aggregates.avgSaveCount)} icon={Bookmark} />
          <StatCard title="Post / Minggu" value={aggregates.postsPerWeek.toFixed(1)} icon={Calendar} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section 3: Grafik Pertumbuhan Akun */}
          <Card className="col-span-1 lg:col-span-2">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Riwayat Pertumbuhan Pengikut
            </h3>
            <div className="h-[300px] w-full">
              {growthHistory?.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthHistory}>
                    <defs>
                      <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c13584" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#c13584" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="date" stroke="#ffffff50" fontSize={12} tickFormatter={(val) => formatDate(val)} />
                    <YAxis stroke="#ffffff50" fontSize={12} tickFormatter={formatNumber} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0d0a14', borderColor: '#ffffff20', borderRadius: '8px' }}
                      labelFormatter={(val) => formatDate(val)}
                      formatter={(val: number) => [formatNumber(val), "Pengikut"]}
                    />
                    <Area type="monotone" dataKey="followerCount" stroke="#c13584" strokeWidth={3} fillOpacity={1} fill="url(#colorFollowers)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center flex-col text-muted-foreground border border-dashed border-white/10 rounded-lg">
                  <Activity className="w-8 h-8 mb-2 opacity-50" />
                  <p>Data tidak cukup untuk menampilkan grafik.</p>
                  <p className="text-sm">Lakukan analisis lagi di hari lain untuk melacak pertumbuhan.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Section 4,5,6: Top Posts */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <TopPostsList title="Top 5 Views" posts={insights.topByViews} icon={Eye} valueKey="viewCount" />
            <TopPostsList title="Top 5 Suka" posts={insights.topByLikes} icon={Heart} valueKey="likeCount" />
            <TopPostsList title="Top 5 Komentar" posts={insights.topByComments} icon={MessageCircle} valueKey="commentCount" />
          </div>

          {/* Section 7: Distribusi Performa */}
          <Card>
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Distribusi Performa Post
            </h3>
            <div className="h-[250px]">
              {performancePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={performancePieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {performancePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0d0a14', borderColor: '#ffffff20', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val: number, name: string) => [`${val} post`, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">Tidak ada data distribusi.</div>
              )}
            </div>
          </Card>

          {/* Section 8 & 9: Hashtags & Mentions */}
          <Card className="flex flex-col justify-center gap-8">
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-muted-foreground uppercase text-xs tracking-wider">
                <Hash className="w-4 h-4 text-primary" /> Top Tema / Hashtag
              </h3>
              <div className="flex flex-wrap gap-2">
                {insights.topHashtags.length > 0 ? insights.topHashtags.map((t, i) => (
                  <Badge key={i} variant={i < 3 ? "default" : "outline"} className={i < 3 ? "bg-gradient-to-r from-[#833ab4] to-[#c13584] border-0" : ""}>
                    #{t.tag} <span className="opacity-70 ml-1.5 text-[10px] bg-black/20 px-1 rounded-sm">{t.count}</span>
                  </Badge>
                )) : <span className="text-muted-foreground text-sm">Tidak ada hashtag terdeteksi.</span>}
              </div>
            </div>
            <div className="h-px w-full bg-white/10" />
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-muted-foreground uppercase text-xs tracking-wider">
                <AtSign className="w-4 h-4 text-primary" /> Top Kolaborasi / Mention
              </h3>
              <div className="flex flex-wrap gap-2">
                {insights.topMentions.length > 0 ? insights.topMentions.map((m, i) => (
                  <Badge key={i} variant="outline" className="border-primary/50 text-primary-foreground bg-primary/10">
                    @{m.mention} <span className="opacity-70 ml-1.5 text-[10px] bg-primary/20 px-1 rounded-sm">{m.count}</span>
                  </Badge>
                )) : <span className="text-muted-foreground text-sm">Tidak ada mention terdeteksi.</span>}
              </div>
            </div>
          </Card>

          {/* Section 10: Performa per Hari */}
          <Card className="lg:col-span-2">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Performa Berdasarkan Hari
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={insights.performanceByDayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="day" stroke="#ffffff50" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#ffffff50" fontSize={12} tickFormatter={formatNumber} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ffffff50" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d0a14', borderColor: '#ffffff20', borderRadius: '8px' }}
                    formatter={(val: number, name: string) => [formatNumber(val), name === "avgLikeCount" ? "Rata-rata Suka" : "Jumlah Post"]}
                  />
                  <Bar yAxisId="left" dataKey="avgLikeCount" fill="#c13584" radius={[4,4,0,0]} name="avgLikeCount" />
                  <Bar yAxisId="right" dataKey="postCount" fill="#ffffff20" radius={[4,4,0,0]} name="postCount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Section 11: Performa Bulanan */}
          <Card className="lg:col-span-2">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Tren Performa Bulanan
            </h3>
            <div className="h-[300px]">
              {insights.performanceByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={insights.performanceByMonth}>
                    <defs>
                      <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="month" stroke="#ffffff50" fontSize={12} />
                    <YAxis stroke="#ffffff50" fontSize={12} tickFormatter={formatNumber} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0d0a14', borderColor: '#ffffff20', borderRadius: '8px' }}
                      formatter={(val: number) => [formatNumber(val), "Total Suka"]}
                    />
                    <Area type="monotone" dataKey="totalLikeCount" name="Total Suka" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorLikes)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">Tidak ada data bulanan.</div>
              )}
            </div>
          </Card>

          {/* Section 12: Durasi / Format */}
          <Card className="lg:col-span-2">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Performa Berdasarkan Format & Durasi
            </h3>
            <div className="h-[300px]">
              {insights.durationAnalysis.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights.durationAnalysis} layout="vertical" margin={{ left: 50, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                    <XAxis type="number" stroke="#ffffff50" fontSize={12} tickFormatter={formatNumber} />
                    <YAxis type="category" dataKey="bucket" stroke="#ffffff50" fontSize={12} width={100} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0d0a14', borderColor: '#ffffff20', borderRadius: '8px' }}
                      formatter={(val: number, name: string) => [formatNumber(val), name === "avgViewCount" ? "Rata-rata Tayangan" : "Jumlah Post"]}
                    />
                    <Bar dataKey="avgViewCount" fill="#10b981" radius={[0,4,4,0]} name="avgViewCount" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">Tidak ada analisis format/durasi.</div>
              )}
            </div>
          </Card>
          
          {/* Section 13: Ringkasan Tahunan */}
          <Card className="lg:col-span-2 overflow-x-auto">
            <h3 className="font-semibold mb-4">Ringkasan Tahunan</h3>
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider bg-white/5">
                <tr>
                  <th className="px-4 py-4 rounded-tl-lg">Tahun</th>
                  <th className="px-4 py-4">Total Post</th>
                  <th className="px-4 py-4">Total Suka</th>
                  <th className="px-4 py-4">Total Komentar</th>
                  <th className="px-4 py-4 rounded-tr-lg">Avg Engagement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {insights.yearlySummary.map((y, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-semibold">{y.year}</td>
                    <td className="px-4 py-3">{formatNumber(y.postCount)}</td>
                    <td className="px-4 py-3">{formatNumber(y.totalLikeCount)}</td>
                    <td className="px-4 py-3">{formatNumber(y.totalCommentCount)}</td>
                    <td className="px-4 py-3">{formatPercent(y.avgEngagementRate)}</td>
                  </tr>
                ))}
                {insights.yearlySummary.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Tidak ada data tahunan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          {/* Section 14: Insight & Rekomendasi */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-t-4 border-t-emerald-500 shadow-[0_-5px_20px_-10px_rgba(16,185,129,0.3)]">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" /> Kekuatan
              </h3>
              <ul className="space-y-3">
                {insights.marketInsights.strengths.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="border-t-4 border-t-amber-500 shadow-[0_-5px_20px_-10px_rgba(245,158,11,0.3)]">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" /> Area Perbaikan
              </h3>
              <ul className="space-y-3">
                {insights.marketInsights.weaknesses.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="border-t-4 border-t-purple-500 bg-purple-900/10 shadow-[0_-5px_20px_-10px_rgba(168,85,247,0.3)]">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-purple-400">
                <Lightbulb className="w-5 h-5" /> Rekomendasi
              </h3>
              <ul className="space-y-3">
                {insights.marketInsights.recommendations.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Section 15: Benchmark Industri */}
          <Card className="lg:col-span-2">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Benchmark Industri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <BenchmarkItem 
                title="Engagement Rate"
                value={formatPercent(aggregates.engagementRate)}
                benchmark={formatPercent(insights.industryBenchmark.engagementRateBenchmark)}
                comparison={insights.industryBenchmark.engagementRateComparison}
              />
              <BenchmarkItem 
                title="Suka per Pengikut"
                value={formatPercent(insights.industryBenchmark.accountLikesPerFollower)}
                benchmark={formatPercent(insights.industryBenchmark.likesPerFollowerBenchmark)}
                comparison={insights.industryBenchmark.likesPerFollowerComparison}
              />
              <BenchmarkItem 
                title="Frekuensi Posting (mingguan)"
                value={aggregates.postsPerWeek.toFixed(1)}
                benchmark={insights.industryBenchmark.postingFrequencyBenchmark.toFixed(1)}
                comparison={insights.industryBenchmark.postingFrequencyComparison}
              />
            </div>
          </Card>
          
        </div>

        {/* All Posts Grid */}
        <div className="pt-12">
          <h2 className="text-2xl font-bold mb-6">Grid Konten</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {posts.map((p) => (
              <a key={p.id} href={p.postUrl} target="_blank" rel="noreferrer" className="group block relative aspect-square bg-white/5 rounded-xl overflow-hidden shadow-lg border border-white/10 hover:border-primary/50 transition-colors">
                <img src={p.thumbnailUrl} className="w-full h-full object-cover" loading="lazy" onError={(e) => (e.currentTarget.style.display = 'none')} />
                <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white p-1.5 rounded-md">
                  {p.mediaType === 'VIDEO' || p.mediaType === 'REEL' ? <PlaySquare className="w-4 h-4" /> : 
                   p.mediaType === 'CAROUSEL_ALBUM' ? <ImageIcon className="w-4 h-4" /> : 
                   <ImageIcon className="w-4 h-4" />}
                </div>
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-4 p-4 text-center">
                  <div className="flex gap-6">
                    <div className="flex items-center gap-1.5"><Heart className="w-5 h-5 text-white" fill="currentColor" /> <span className="font-semibold text-lg">{formatNumber(p.likeCount)}</span></div>
                    <div className="flex items-center gap-1.5"><MessageCircle className="w-5 h-5 text-white" fill="currentColor" /> <span className="font-semibold text-lg">{formatNumber(p.commentCount)}</span></div>
                  </div>
                  {(p.mediaType === 'VIDEO' || p.mediaType === 'REEL') && (
                    <div className="flex items-center gap-1.5 text-sm font-medium"><Eye className="w-4 h-4 text-white" /> {formatNumber(p.viewCount)} tayangan</div>
                  )}
                  <div className="text-xs text-white/70 mt-auto">{formatDate(p.createTime)}</div>
                </div>
              </a>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, highlight = false }: { title: string, value: string | number, icon: any, highlight?: boolean }) {
  return (
    <Card noPadding className={cn("p-4 flex flex-col gap-2 relative overflow-hidden transition-all duration-300", highlight && "border-primary/50 shadow-[0_0_15px_rgba(193,53,132,0.2)]", !highlight && "hover:border-white/20")}>
      {highlight && <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none" />}
      <div className="relative">
        <Icon className={cn("w-5 h-5 mb-2", highlight ? "text-primary" : "text-muted-foreground")} />
        <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium truncate">{title}</p>
        <p className={cn("text-2xl font-bold mt-1", highlight && "text-transparent bg-clip-text bg-gradient-to-r from-[#833ab4] via-[#c13584] to-[#e1306c]")}>{value}</p>
      </div>
    </Card>
  );
}

function TopPostsList({ title, posts, icon: Icon, valueKey }: { title: string, posts: any[], icon: any, valueKey: 'viewCount'|'likeCount'|'commentCount' }) {
  if (!posts?.length) return null;
  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="space-y-4 flex-1">
        {posts.slice(0, 5).map((p, i) => (
          <a key={p.id} href={p.postUrl} target="_blank" rel="noopener noreferrer" className="flex gap-4 items-center group bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors border border-transparent hover:border-white/10">
            <div className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden bg-[#0d0a14]">
              <img src={p.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={(e) => (e.currentTarget.style.display = 'none')} />
              <div className="absolute top-1 left-1 bg-black/80 text-[10px] px-1.5 rounded font-bold">{i+1}</div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="text-sm text-muted-foreground truncate" title={p.caption}>{p.caption || "Tidak ada caption"}</p>
              <p className="font-bold text-sm mt-1 text-foreground">{formatNumber(p[valueKey])} <span className="font-normal text-xs text-muted-foreground capitalize">{valueKey.replace('Count', '')}</span></p>
            </div>
          </a>
        ))}
      </div>
    </Card>
  );
}

function BenchmarkItem({ title, value, benchmark, comparison }: { title: string, value: string, benchmark: string, comparison: string }) {
  const isAbove = comparison === "above";
  const isBelow = comparison === "below";
  
  return (
    <div className="p-5 rounded-lg bg-white/5 border border-white/10 flex flex-col items-center text-center relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${isAbove ? 'bg-emerald-500' : isBelow ? 'bg-red-500' : 'bg-amber-500'}`} />
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{title}</p>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <p className="text-xs text-muted-foreground mb-4">Benchmark: <span className="font-medium text-foreground">{benchmark}</span></p>
      <Badge variant={isAbove ? "success" : isBelow ? "danger" : "warning"} className="w-full justify-center py-1">
        {isAbove ? "Di Atas Rata-rata" : isBelow ? "Di Bawah Rata-rata" : "Rata-rata"}
      </Badge>
    </div>
  );
}
