import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { getPath } from "@/utils/getPath";
import getSortedPosts from "@/utils/getSortedPosts";
import { SITE } from "@/config";
import { byLang, ui } from "@/i18n";

export async function GET() {
  const posts = await getCollection("blog", byLang("en"));
  const sortedPosts = getSortedPosts(posts);
  return rss({
    title: ui.en.siteTitle,
    description: ui.en.siteDesc,
    site: SITE.website,
    items: sortedPosts.map(({ data, id, filePath }) => ({
      link: getPath(id, filePath, true, data.slug),
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
    })),
  });
}
