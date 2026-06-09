"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };

export default function StarRating({
  value,
  onChange,
  size = "md",
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const interactive = Boolean(onChange);
  const displayed = interactive && hovered > 0 ? hovered : value;

  return (
    <div
      className={`flex gap-0.5 ${interactive ? "cursor-pointer" : ""}`}
      onMouseLeave={() => interactive && setHovered(0)}
      role={interactive ? "radiogroup" : undefined}
      aria-label="Note sur 5 étoiles"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
          aria-pressed={value === star}
          className={`${sizes[size]} ${interactive ? "hover:scale-110 transition-transform" : ""} disabled:cursor-default`}
        >
          <svg
            viewBox="0 0 24 24"
            fill={star <= displayed ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={1.5}
            className={`${sizes[size]} ${
              star <= displayed
                ? "text-amber-400"
                : "text-stone-300"
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}
