import { Homepage } from "@/components/home/Homepage";

// Public marketing homepage (logged-out landing). Static & backend-independent;
// its CTAs route into the live app at /dashboard.
export default function Home() {
  return <Homepage />;
}
