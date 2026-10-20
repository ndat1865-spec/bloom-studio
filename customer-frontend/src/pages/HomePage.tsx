import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Hero } from "@/components/home/Hero";
import { ArrangementTypes } from "@/components/home/ArrangementTypes";
import { Occasions } from "@/components/home/Occasions";
import { SignatureCollection } from "@/components/home/SignatureCollection";
import { Process } from "@/components/home/Process";
import { About } from "@/components/home/About";
import { Weddings } from "@/components/home/Weddings";
import { Testimonials } from "@/components/home/Testimonials";
import { DeliveryCta } from "@/components/home/DeliveryCta";
import { refreshTriggersWhenReady } from "@/lib/motion";

export default function HomePage() {
  const location = useLocation();

  // Font tai xong lam doi chieu cao chu -> ScrollTrigger can tinh lai moc.
  // Goi mot lan khi mount, khong goi o moi render.
  useEffect(() => refreshTriggersWhenReady(), []);

  // Nhay toi section khi vao trang bang duong dan co hash (vi du /#weddings)
  useEffect(() => {
    if (!location.hash) return;
    const target = document.querySelector(location.hash);
    if (!target) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  }, [location.hash]);

  // Ghi chu: KHONG goi ScrollTrigger.getAll().kill() o day.
  // Moi section tu don trigger cua rieng no qua useGSAP + scope; mot lenh kill "quet sach"
  // se xoa ca trigger cua component khac va dua toi tinh trang section khong bao gio hien
  // (de thay nhat khi React StrictMode mount lai trong che do dev).

  return (
    <>
      <Hero />
      <Occasions />
      <ArrangementTypes />
      <SignatureCollection />
      <Process />
      <About />
      <Weddings />
      <Testimonials />
      <DeliveryCta />
    </>
  );
}
