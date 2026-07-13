import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListInstagramAnalyses, useCreateInstagramAnalysis, useDeleteInstagramAnalysis, getListInstagramAnalysesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, Input, Avatar, Skeleton } from "@/components/ui";
import { formatNumber } from "@/lib/utils";
import { Search, Loader2, Trash2, ChevronRight, BarChart2 } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { toast } from "sonner";

export default function Home() {
  const [input, setInput] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const { data: history, isLoading } = useListInstagramAnalyses();
  
  const createMutation = useCreateInstagramAnalysis({
    mutation: {
      onSuccess: (data) => {
        toast.success("Analisis selesai!");
        setLocation(`/analysis/${data.id}`);
      },
      onError: () => {
        toast.error("Gagal menganalisis akun. Periksa kembali username atau URL profil.");
      }
    }
  });

  const deleteMutation = useDeleteInstagramAnalysis({
    mutation: {
      onSuccess: () => {
        toast.success("Riwayat berhasil dihapus");
        queryClient.invalidateQueries({ queryKey: getListInstagramAnalysesQueryKey() });
      }
    }
  });

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    createMutation.mutate({ data: { input } });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl space-y-8 animate-in slide-in-from-bottom-4 duration-500 fade-in">
        
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#fcb045] via-[#fd1d1d] to-[#833ab4] flex items-center justify-center shadow-[0_0_30px_rgba(193,53,132,0.3)]">
            <SiInstagram className="text-white text-3xl" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Instagram Insight</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Platform analitik mendalam untuk kreator dan brand. Masukkan username atau link profil Instagram untuk melihat data performa.
          </p>
        </div>

        <Card className="p-2 border-white/20 bg-black/40 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2 relative">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Username (contoh: @nasa) atau URL profil" 
                  className="pl-10 h-12 text-base bg-transparent border-0 ring-0 focus-visible:ring-0 shadow-none"
                  disabled={createMutation.isPending}
                />
              </div>
              <Button 
                type="submit" 
                className="h-12 px-8 text-base font-semibold min-w-[180px]"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  "Analisis Profil"
                )}
              </Button>
            </div>
            {createMutation.isPending && (
              <p className="text-sm text-primary animate-pulse text-center w-full px-4 pb-2">
                Sedang menganalisis akun Instagram, mohon tunggu sebentar...
              </p>
            )}
          </form>
        </Card>

        <div className="space-y-4 pt-8">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" />
            Riwayat Analisis
          </h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : history?.length === 0 ? (
             <div className="text-center py-12 border border-white/10 border-dashed rounded-xl bg-white/5">
               <p className="text-muted-foreground">Belum ada riwayat pencarian yang tersimpan.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history?.map((item) => (
                <Card key={item.id} noPadding className="group hover:border-primary/50 transition-colors overflow-hidden flex flex-col relative">
                  <div className="p-4 flex gap-4 items-start flex-1">
                    <Avatar src={item.profilePicUrl} fallback={item.username[0].toUpperCase()} className="w-12 h-12 ring-2 ring-white/10" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg truncate">{item.fullName || item.username}</h3>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive absolute top-4 right-4 bg-background/80"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteMutation.mutate({ id: item.id });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">@{item.username}</p>
                      
                      <div className="flex items-center gap-3 mt-3 text-sm">
                        <div>
                          <span className="font-medium text-foreground">{formatNumber(item.followerCount)}</span>
                          <span className="text-muted-foreground ml-1">Pengikut</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <div>
                          <span className="font-medium text-foreground">{formatNumber(item.postCount)}</span>
                          <span className="text-muted-foreground ml-1">Post</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Link href={`/analysis/${item.id}`} className="bg-white/5 px-4 py-3 flex items-center justify-between hover:bg-white/10 transition-colors text-sm font-medium border-t border-white/5">
                    Lihat Laporan Lengkap
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
