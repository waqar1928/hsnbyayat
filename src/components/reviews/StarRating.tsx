"use client";

// Display-only by default (readOnly=true); pass onChange for the write-review form's input mode.
export default function StarRating({
  value,
  onChange,
  readOnly = true,
  size = 18,
}: {
  value: number;
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  return (
    <span className="star-rating" role={readOnly ? "img" : "radiogroup"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        if (readOnly) {
          return (
            <span key={star} className={`star ${filled ? "filled" : ""}`} style={{ fontSize: size }} aria-hidden="true">
              ★
            </span>
          );
        }
        return (
          <button
            key={star}
            type="button"
            className={`star star-btn ${filled ? "filled" : ""}`}
            style={{ fontSize: size }}
            onClick={() => onChange?.(star)}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            role="radio"
            aria-checked={star === value}
          >
            ★
          </button>
        );
      })}
    </span>
  );
}
