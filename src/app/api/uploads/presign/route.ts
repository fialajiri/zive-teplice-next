import { container } from "@/server/container";
import { requireAdmin } from "@/server/actions/guards";
import { presignRequestSchema } from "@/schemas/upload";

// POST /api/uploads/presign — Node runtime (default). Validates auth + MIME/size
// BEFORE issuing any presigned URL, then returns one presigned PUT per file so the
// browser uploads straight to S3 (bypassing Vercel's ~4.5 MB body limit).
// Errors are generic — no signature/credential/internals leak to the client.
export async function POST(request: Request): Promise<Response> {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return Response.json({ error: "Nedostatečná oprávnění." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Neplatný požadavek." }, { status: 400 });
  }

  const parsed = presignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Neplatný soubor k nahrání." },
      { status: 400 },
    );
  }

  const { prefix, files } = parsed.data;
  try {
    const uploads = await Promise.all(
      files.map((file) =>
        container.storage.presignUpload({
          filename: file.filename,
          contentType: file.contentType,
          prefix,
        }),
      ),
    );
    return Response.json({ uploads });
  } catch {
    return Response.json(
      { error: "Nahrání se nepodařilo připravit." },
      { status: 500 },
    );
  }
}
