import { mediaUrl } from "@/lib/media-url";
import { getArtStyles, getGallery } from "@/server/gallery";
import { adminUpdateGalleryItem, adminUploadGallery } from "@/actions/admin";
import { ActionForm, Submit } from "@/components/forms";

export const metadata = { title: "Gallery" };

export default async function AdminGalleryPage() {
  const [items, styles] = await Promise.all([getGallery({ includeUnpublished: true }), getArtStyles()]);
  const styleSelect = (name: string, value?: string | null) => (
    <select name={name} defaultValue={value ?? ""} className="input py-1.5 text-xs" aria-label="Nail art style">
      <option value="">No style</option>
      {styles.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );

  return (
    <div className="space-y-6">
      <h1 className="h-display text-3xl">Gallery</h1>

      <ActionForm action={adminUploadGallery} resetOnSuccess className="card grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="font-serif text-lg text-plum sm:col-span-2">Upload photos</h2>
        <div className="sm:col-span-2">
          <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-pale file:px-4 file:py-2 file:text-sm file:font-bold file:text-rose" aria-label="Photos" />
          <p className="mt-1 text-xs text-muted">Up to 10 at a time. Photos are resized and location/camera data is removed automatically.</p>
        </div>
        <div>
          <label className="label" htmlFor="g-caption">Caption</label>
          <input id="g-caption" name="caption" className="input" placeholder="e.g. Chrome almond extensions" />
        </div>
        <div>
          <label className="label">Style</label>
          {styleSelect("artStyleId")}
        </div>
        <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" name="isPublished" defaultChecked className="accent-pink" /> Publish now</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" className="accent-pink" /> Show on home page</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="clientConsent" className="accent-pink" /> Client agreed to photo being shared</label>
        </div>
        <div className="sm:col-span-2"><Submit className="btn-primary">Upload</Submit></div>
      </ActionForm>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((g) => (
          <div key={g.id} className={`card overflow-hidden ${g.isPublished ? "" : "opacity-70"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(g.mediaId)} alt={g.caption} loading="lazy" className="h-48 w-full object-cover" />
            <form action={adminUpdateGalleryItem} className="space-y-2 p-3">
              <input type="hidden" name="id" value={g.id} />
              <input name="caption" defaultValue={g.caption} className="input py-1.5 text-sm" aria-label="Caption" />
              <div className="grid grid-cols-[1fr_70px] gap-2">
                {styleSelect("artStyleId", g.artStyleId)}
                <input name="sortOrder" type="number" defaultValue={g.sortOrder} className="input py-1.5 text-xs" aria-label="Order" title="Order (lower first)" />
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <label className="flex items-center gap-1"><input type="checkbox" name="isPublished" defaultChecked={g.isPublished} className="accent-pink" /> Published</label>
                <label className="flex items-center gap-1"><input type="checkbox" name="isFeatured" defaultChecked={g.isFeatured} className="accent-pink" /> Home page</label>
                <label className="flex items-center gap-1"><input type="checkbox" name="clientConsent" defaultChecked={g.clientConsent} className="accent-pink" /> Consent</label>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button name="op" value="save" className="btn-outline btn-sm">Save</button>
                {g.artStyleId && <button name="op" value="cover" className="btn-ghost btn-sm">Use as style cover</button>}
                <Submit name="op" value="delete" className="btn-danger btn-sm" confirm="Delete this photo permanently?">Delete</Submit>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
