import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
}

const BASE_URL = "https://meeet.world";
const DEFAULT_OG = `${BASE_URL}/og-image.png`;

const SEOHead = ({ title, description, path, ogImage }: SEOHeadProps) => {
  useEffect(() => {
    document.title = title;
    const canonical = `${BASE_URL}${path}`;
    const image = ogImage || DEFAULT_OG;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonical);
    setMeta("property", "og:image", image);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:site", "@meeetworld");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);
  }, [title, description, path, ogImage]);

  return null;
};

export default SEOHead;
