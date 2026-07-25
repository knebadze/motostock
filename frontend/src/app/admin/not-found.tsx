import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          გვერდი ვერ მოიძებნა
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          გვერდი, რომელსაც ეძებთ, არ არსებობს ან გადატანილია.
        </p>
        <Link
          href="/admin"
          className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          ადმინ პანელზე დაბრუნება
        </Link>
      </div>
    </div>
  );
}
