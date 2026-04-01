import { supabase } from "@/integrations/supabase/client";

export interface VariantGroup {
  id: string;
  name: string;
  sort_order: number | null;
}

export interface ProductWithRelations {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  original_price: number;
  sale_price: number;
  discount_percent: number;
  promo_tag: string | null;
  flash_sale: boolean | null;
  flash_sale_ends_in: string | null;
  free_shipping: boolean | null;
  shipping_cost: number | null;
  estimated_delivery: string | null;
  checkout_type: string;
  external_checkout_url: string | null;
  rating: number | null;
  review_count: number | null;
  sold_count: number | null;
  active: boolean | null;
  sort_order: number | null;
  video_url: string | null;
  product_images: { id: string; url: string; alt: string | null; sort_order: number | null }[];
  product_variants: { id: string; name: string; color: string | null; thumbnail_url: string | null; sort_order: number | null; variant_group_id: string | null }[];
  variant_groups: VariantGroup[];
  reviews: { id: string; user_name: string; user_avatar_url: string | null; city: string | null; rating: number; comment: string | null; photos: string[] | null; review_date: string | null }[];
}

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      product_images(id, url, alt, sort_order),
      product_variants(id, name, color, thumbnail_url, sort_order, variant_group_id),
      variant_groups(id, name, sort_order),
      reviews(id, user_name, user_avatar_url, city, rating, comment, photos, review_date)
    `)
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data as ProductWithRelations[];
}

export async function fetchProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      product_images(id, url, alt, sort_order),
      product_variants(id, name, color, thumbnail_url, sort_order, variant_group_id),
      variant_groups(id, name, sort_order),
      reviews(id, user_name, user_avatar_url, city, rating, comment, photos, review_date)
    `)
    .eq("slug", slug)
    .single();

  if (error) throw error;

  // Also fetch reviews linked via review_products join table
  const { data: linkedReviewProducts } = await supabase
    .from("review_products")
    .select("review_id")
    .eq("product_id", data.id);

  if (linkedReviewProducts && linkedReviewProducts.length > 0) {
    const linkedReviewIds = linkedReviewProducts.map((rp: any) => rp.review_id);
    // Filter out reviews already present
    const existingIds = new Set((data.reviews || []).map((r: any) => r.id));
    const missingIds = linkedReviewIds.filter((id: string) => !existingIds.has(id));

    if (missingIds.length > 0) {
      const { data: extraReviews } = await supabase
        .from("reviews")
        .select("id, user_name, user_avatar_url, city, rating, comment, photos, review_date")
        .in("id", missingIds);

      if (extraReviews) {
        data.reviews = [...(data.reviews || []), ...extraReviews];
      }
    }
  }

  return data as ProductWithRelations;
}

export async function fetchStoreSettings() {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchStoreBySlug(slug: string) {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchStoreProducts(storeId: string) {
  const { data, error } = await supabase
    .from("store_products")
    .select(`
      product_id,
      sort_order,
      products:product_id (
        *,
        product_images(id, url, alt, sort_order)
      )
    `)
    .eq("store_id", storeId)
    .order("sort_order");

  if (error) throw error;
  // Flatten the joined data
  return (data || [])
    .map((sp: any) => sp.products)
    .filter(Boolean) as ProductWithRelations[];
}

export async function fetchStoreForProduct(productId: string) {
  const { data, error } = await supabase
    .from("store_products")
    .select(`
      stores:store_id (
        id, name, slug, logo_url, description, rating, total_sales
      )
    `)
    .eq("product_id", productId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as any)?.stores || null;
}

export async function fetchTrustBadges() {
  const { data, error } = await supabase
    .from("trust_badges")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data;
}
