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

export interface ProductListItem {
  id: string;
  slug: string;
  title: string;
  original_price: number;
  sale_price: number;
  discount_percent: number;
  sold_count: number | null;
  product_images: { id: string; url: string; alt: string | null; sort_order: number | null }[];
}

export interface RelatedProductItem {
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
  product_images: { id: string; url: string; alt: string | null; sort_order: number | null }[];
}

export async function fetchProducts() {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      slug,
      title,
      original_price,
      sale_price,
      discount_percent,
      sold_count,
      product_images(id, url, alt, sort_order)
    `)
    .eq("active", true)
    .order("sort_order");

  if (error) throw error;
  return data as ProductListItem[];
}

export async function fetchProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      slug,
      title,
      description,
      original_price,
      sale_price,
      discount_percent,
      promo_tag,
      flash_sale,
      flash_sale_ends_in,
      free_shipping,
      shipping_cost,
      estimated_delivery,
      checkout_type,
      external_checkout_url,
      rating,
      review_count,
      sold_count,
      active,
      sort_order,
      video_url,
      product_images(id, url, alt, sort_order),
      product_variants(id, name, color, thumbnail_url, sort_order, variant_group_id),
      variant_groups(id, name, sort_order)
    `)
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return { ...data, reviews: [] } as ProductWithRelations;
}

export async function fetchProductReviews(productId: string) {
  const reviewSelect = "id, user_name, user_avatar_url, city, rating, comment, photos, review_date";

  const [{ data: directReviews, error: directError }, { data: linkedReviews, error: linkedError }] = await Promise.all([
    supabase
      .from("reviews")
      .select(reviewSelect)
      .eq("product_id", productId),
    supabase
      .from("review_products")
      .select(`reviews:review_id(${reviewSelect})`)
      .eq("product_id", productId),
  ]);

  if (directError) throw directError;
  if (linkedError) throw linkedError;

  const uniqueReviews = new Map<string, ProductWithRelations["reviews"][number]>();

  for (const review of directReviews || []) {
    uniqueReviews.set(review.id, review);
  }

  for (const row of linkedReviews || []) {
    const review = (row as any).reviews;
    if (review?.id) {
      uniqueReviews.set(review.id, review);
    }
  }

  return Array.from(uniqueReviews.values());
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
        id,
        slug,
        title,
        original_price,
        sale_price,
        discount_percent,
        sold_count,
        product_images(id, url, alt, sort_order)
      )
    `)
    .eq("store_id", storeId)
    .order("sort_order");

  if (error) throw error;
  return (data || [])
    .map((sp: any) => sp.products)
    .filter(Boolean) as ProductListItem[];
}

export async function fetchRelatedStoreProducts(storeId: string, currentProductId: string, limit = 6) {
  const { data, error } = await supabase
    .from("store_products")
    .select(`
      product_id,
      sort_order,
      products:product_id (
        id,
        slug,
        title,
        description,
        original_price,
        sale_price,
        discount_percent,
        promo_tag,
        flash_sale,
        flash_sale_ends_in,
        free_shipping,
        shipping_cost,
        estimated_delivery,
        checkout_type,
        external_checkout_url,
        rating,
        review_count,
        sold_count,
        product_images(id, url, alt, sort_order)
      )
    `)
    .eq("store_id", storeId)
    .order("sort_order")
    .limit(limit + 1);

  if (error) throw error;

  return (data || [])
    .map((sp: any) => sp.products)
    .filter(Boolean)
    .filter((product: RelatedProductItem) => product.id !== currentProductId)
    .slice(0, limit) as RelatedProductItem[];
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
