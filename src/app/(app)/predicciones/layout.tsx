import { PredictionSwipeNavigation } from "@/components/porra/prediction-swipe-navigation";

export default function PredictionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PredictionSwipeNavigation>{children}</PredictionSwipeNavigation>;
}
