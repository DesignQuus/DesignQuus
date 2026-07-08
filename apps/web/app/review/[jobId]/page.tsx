import { ExtractionReview } from './review-client';

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ tenantId?: string; fileVersionId?: string; floorId?: string }>;
}) {
  const { jobId } = await params;
  const { tenantId, fileVersionId, floorId } = await searchParams;
  return (
    <ExtractionReview
      jobId={jobId}
      tenantId={tenantId ?? ''}
      fileVersionId={fileVersionId ?? ''}
      floorId={floorId ?? ''}
    />
  );
}
