import { Link } from "wouter";
import { Button } from "@/components/ui";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-6 animate-in slide-in-from-bottom-4 fade-in">
        <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-xl text-muted-foreground">Halaman Tidak Ditemukan</p>
        <p className="text-muted-foreground max-w-sm mx-auto">
          URL yang Anda tuju tidak tersedia atau telah dipindahkan.
        </p>
        <Link href="/">
          <Button className="mt-4">Kembali ke Beranda</Button>
        </Link>
      </div>
    </div>
  );
}
