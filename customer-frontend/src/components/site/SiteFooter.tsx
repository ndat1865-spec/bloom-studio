import { Link } from "react-router-dom";

const SOCIAL = [
  { label: "Instagram", href: "https://www.instagram.com/" },
  { label: "Pinterest", href: "https://www.pinterest.com/" },
  { label: "Google", href: "https://www.google.com/maps" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="shell flex flex-col gap-10 py-14 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            to="/"
            className="font-display text-3xl font-bold italic leading-none text-accent transition-colors hover:text-accent-strong"
          >
            Bloom Studio
          </Link>
          <p className="mt-4 max-w-sm text-sm font-light text-muted-foreground">
            Floral design studio, Tây Hồ, Hà Nội, Việt Nam. Hand-tied arrangements, event florals
            and wedding flowers — cut fresh the day you order.
          </p>
        </div>

        <nav aria-label="Mạng xã hội" className="flex flex-wrap gap-x-8 gap-y-3">
          {SOCIAL.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer noopener"
              className="label-micro text-muted-foreground transition-colors hover:text-accent"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="border-t border-border">
        <div className="shell py-6">
          <p className="label-micro text-muted-foreground">
            © 2026 Bloom Studio · Tiệm hoa Hà Nội · Giao trong ngày nội thành
          </p>
        </div>
      </div>
    </footer>
  );
}
