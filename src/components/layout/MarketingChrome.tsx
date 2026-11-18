import { SiteFooter } from "./SiteFooter";
import { SiteHeader, SiteHeaderSpacer } from "./SiteHeader";

/**
 * Alias historiques — les pages marketing importaient `MarketingNav` et
 * `MarketingFooter`. Ils pointent maintenant sur l'en-tête et le pied de page
 * uniques du site (DA V4) : préférer `SiteHeader` / `SiteFooter` dans tout
 * nouveau code.
 */
export function MarketingNav() {
  return (
    <>
      <SiteHeader />
      <SiteHeaderSpacer />
    </>
  );
}

export function MarketingFooter() {
  return <SiteFooter />;
}
