import clsx from "clsx";

type Variant = "horizontal" | "isopo";

interface LogoProps {
  variant?: Variant;
  className?: string;
  alt?: string;
}

export default function Logo({
  variant = "horizontal",
  className,
  alt = "MediControl",
}: LogoProps) {
  const src =
    variant === "isopo" ? "./isopo.png" : "./logo-horizontal.png";

  return (
    <img
      src={src}
      alt={alt}
      className={clsx(
        variant === "isopo" ? "h-10 w-10" : "h-10 w-auto",
        "select-none",
        className,
      )}
      draggable={false}
    />
  );
}
