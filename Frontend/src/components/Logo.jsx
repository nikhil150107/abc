import React from "react";

export default function Logo({ size = 24, style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <path
        d="M16 2L4 7v9c0 7.18 5.16 13.9 12 15.93C22.84 29.9 28 23.18 28 16V7L16 2z"
        fill="#0F172A"
      />
      <path
        d="M13 17.5l-3-3 1.41-1.41L13 14.67l4.59-4.58L19 11.5z"
        fill="white"
      />
    </svg>
  );
}
