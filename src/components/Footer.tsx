import LegalLinks from "@/components/LegalLinks";
import logo from "@/assets/logo.png";
import { useUiTheme } from "@/hooks/useUiTheme";
import { bannerBackgroundStyle } from "@/lib/uiThemes";

const Footer = () => {
  const { config } = useUiTheme();
  const bg = bannerBackgroundStyle(config.footer);
  return (
  <footer className={`border-t bg-card py-12 ${bg ? "[&_*]:!text-primary-foreground" : ""}`} style={bg}>
    <div className="container grid gap-8 md:grid-cols-4">
      <div>
        <img src={logo} alt="Pennyekart" className="mb-4 h-8" />
        <p className="text-sm text-muted-foreground">Your trusted marketplace for amazing deals and quality products.</p>
      </div>
      {[
        { title: "Shop", links: ["Electronics", "Fashion", "Home", "Sports"] },
        { title: "Company", links: ["About Us", "Careers", "Blog", "Press"] },
        { title: "Help", links: ["Contact", "FAQs", "Shipping", "Returns"] },
      ].map((col) => (
        <div key={col.title}>
          <h4 className="mb-3 font-heading text-sm font-semibold">{col.title}</h4>
          <ul className="space-y-2">
            {col.links.map((l) => (
              <li key={l}>
                <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="container mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
      © 2026 Pennyekart. All rights reserved.
      <LegalLinks showDelete className="mt-2" />
    </div>
  </footer>
  );
};

export default Footer;
