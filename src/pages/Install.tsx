import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Smartphone, Wifi, WifiOff, Zap, Shield, Bell, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Zap, title: "Мгновенный запуск", desc: "Открывается как родное приложение" },
    { icon: WifiOff, title: "Работает офлайн", desc: "Основные функции доступны без интернета" },
    { icon: Bell, title: "Уведомления", desc: "Будьте в курсе событий агентов" },
    { icon: Shield, title: "Безопасность", desc: "Все данные защищены шифрованием" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-32 max-w-2xl">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <Smartphone className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
            Установите MEEET
          </h1>
          <p className="text-muted-foreground font-body max-w-md mx-auto">
            Добавьте приложение на домашний экран для быстрого доступа к вашим агентам
          </p>
        </div>

        {/* Install action */}
        <Card className="glass-card border-primary/20 mb-8">
          <CardContent className="p-6 text-center">
            {isInstalled ? (
              <div className="flex flex-col items-center gap-3">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <p className="font-display font-bold text-lg">Приложение установлено!</p>
                <p className="text-sm text-muted-foreground">MEEET уже на вашем домашнем экране</p>
              </div>
            ) : deferredPrompt ? (
              <div className="flex flex-col items-center gap-4">
                <Button size="lg" onClick={handleInstall} className="gap-2 text-base px-8">
                  <Download className="w-5 h-5" /> Установить MEEET
                </Button>
                <p className="text-xs text-muted-foreground">Бесплатно · Менее 1 МБ</p>
              </div>
            ) : isIOS ? (
              <div className="space-y-4">
                <p className="font-display font-semibold">Как установить на iPhone / iPad:</p>
                <ol className="text-left text-sm text-muted-foreground space-y-3 font-body">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                    <span>Нажмите кнопку <strong className="text-foreground">«Поделиться»</strong> (квадрат со стрелкой внизу Safari)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
                    <span>Прокрутите вниз и нажмите <strong className="text-foreground">«На экран Домой»</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
                    <span>Нажмите <strong className="text-foreground">«Добавить»</strong> — готово!</span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-display font-semibold">Установка из браузера</p>
                <p className="text-sm text-muted-foreground font-body">
                  Откройте меню браузера (⋮) → «Установить приложение» или «Добавить на главный экран»
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <Card key={f.title} className="glass-card border-border">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <f.icon className="w-6 h-6 text-primary" />
                <p className="font-display font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground font-body">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Install;
