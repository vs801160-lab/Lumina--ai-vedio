import React from "react";

type Props = {
  title?: string;
  thumbnail?: string;
  url?: string;
};

export default function VideoCard({
  title = "Video",
  thumbnail,
  url,
}: Props) {
  return (
    <article className="video-card">
      {thumbnail && (
        <img
          src={thumbnail}
          alt={title}
          className="w-full rounded-md"
        />
      )}

      <h3 className="mt-2 font-semibold">{title}</h3>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Open video
        </a>
      )}
    </article>
  );
}
