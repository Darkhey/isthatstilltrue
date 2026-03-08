import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  jsonLd?: Record<string, unknown>;
}

const defaults = {
  title: "Is That Still True? - Discover Outdated Facts You Learned in School",
  description:
    "Uncover the shocking truth about what you learned in school! Discover which 'facts' from your education have been debunked by modern science and research.",
  image: "https://isthatstilltrue.com/og-image.png",
  url: "https://isthatstilltrue.com",
};

export const SEOHead = ({
  title,
  description,
  image,
  url,
  type = "website",
  jsonLd,
}: SEOHeadProps) => {
  const t = title ? `${title} | Is That Still True?` : defaults.title;
  const d = description || defaults.description;
  const i = image || defaults.image;
  const u = url || defaults.url;

  return (
    <Helmet>
      <title>{t}</title>
      <meta name="description" content={d} />
      <link rel="canonical" href={u} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={u} />
      <meta property="og:title" content={t} />
      <meta property="og:description" content={d} />
      <meta property="og:image" content={i} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={u} />
      <meta name="twitter:title" content={t} />
      <meta name="twitter:description" content={d} />
      <meta name="twitter:image" content={i} />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};
