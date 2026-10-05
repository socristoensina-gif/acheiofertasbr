export type ProductLookup = {
  name: string;
  imageUrl: string | null;
  currentPrice: number | null;
  previousPrice: number | null;
};

export async function fetchProduct(_url: string): Promise<ProductLookup | null> {
  void _url;
  return null;
}