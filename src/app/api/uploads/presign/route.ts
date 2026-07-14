import { auth } from "@/auth";
import { container } from "@/server/container";
import { requireAdmin } from "@/server/actions/guards";
import { getRegistrationOpen } from "@/server/application/settings";
import { presignRequestSchema, type UploadPrefix } from "@/schemas/upload";

// Authorize a presign request by its destination prefix. Content prefixes
// (news/gallery/program) are admin-only. The `performer` prefix is the profile
// image and must be reachable by:
//   • any authenticated user — a performer (or admin) editing a profile, and
//   • an anonymous visitor ONLY while registration is open — the sign-up flow.
// Registration being closed falls back to closed (getRegistrationOpen fails safe),
// so anonymous uploads are refused exactly when sign-up is refused.
async function isPresignAuthorized(prefix: UploadPrefix): Promise<boolean> {
  if (prefix === "performer") {
    const session = await auth();
    if (session) return true;
    return getRegistrationOpen(container.settingsRepository);
  }
  const admin = await requireAdmin();
  return admin.ok;
}

// POST /api/uploads/presign — Node runtime (default). Validates MIME/size + auth
// BEFORE issuing any presigned URL, then returns one presigned PUT per file so the
// browser uploads straight to S3 (bypassing Vercel's ~4.5 MB body limit).
// Errors are generic — no signature/credential/internals leak to the client.
export async function POST(request: Request): Promise<Response> {
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

  if (!(await isPresignAuthorized(prefix))) {
    return Response.json({ error: "Nedostatečná oprávnění." }, { status: 403 });
  }

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
