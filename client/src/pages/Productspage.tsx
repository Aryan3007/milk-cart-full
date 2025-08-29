import { useState, useEffect, useMemo } from "react";
import { Search, Filter, SortAsc, X } from "lucide-react";
import { Product } from "../types";
import { ApiService } from "../services/api";
import ProductCard from "../components/ProductCard";
import AnimatedSection from "../components/AnimatedSection";

interface ApiProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  inStock: boolean;
  brand?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "name" | "price-low" | "price-high" | "rating"
  >("name");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    loadProducts();
    window.scrollTo(0, 0);
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await ApiService.getProducts();
      const apiProducts = response.products || [];
      const transformedProducts: Product[] = apiProducts.map(
        (apiProduct: ApiProduct) => ({
          id: apiProduct.id,
          name: apiProduct.name,
          description: apiProduct.description,
          price: apiProduct.price,
          image: apiProduct.images?.[0] || "/placeholder.jpg",
          hoverImage: apiProduct.images?.[1] || "",
          category: apiProduct.category,
          stock: apiProduct.stock,
          badges: apiProduct.inStock ? ["In Stock"] : ["Out of Stock"],
          rating: 4.5,
          reviews: 0,
          unit: "piece",
        })
      );
      setProducts(transformedProducts);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(q)
      );
    }
    filtered = [...filtered];
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return b.rating - a.rating;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return filtered;
  }, [products, selectedCategory, searchQuery, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-0">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="overflow-hidden bg-white shadow-md dark:bg-gray-800 rounded-xl animate-pulse"
              >
                <div className="h-64 bg-gray-200 dark:bg-gray-700"></div>
                <div className="p-6 space-y-4">
                  <div className="w-3/4 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
                  <div className="w-1/2 h-4 bg-gray-200 rounded dark:bg-gray-700"></div>
                  <div className="w-1/3 h-8 bg-gray-200 rounded dark:bg-gray-700"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <AnimatedSection>
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl dark:text-white">
              Dairy Delights
            </h1>
            <p className="max-w-3xl mx-auto mt-2 text-lg text-gray-600 dark:text-gray-300">
              Explore our premium selection of fresh, high-quality dairy
              products crafted with care.
            </p>
          </div>
        </AnimatedSection>

        {/* Controls Section */}
        <AnimatedSection className="mb-8" delay={0.2}>
          <div className="flex flex-col items-start gap-4 md:flex-row">
            {/* Search Bar */}
            <div className="w-full md:w-1/3">
              <div className="relative">
                <Search
                  className="absolute text-gray-500 transform -translate-y-1/2 left-4 top-1/2"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search for dairy products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-3 pl-12 pr-4 text-gray-900 placeholder-gray-500 transition-all duration-300 bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {searchQuery && (
                  <X
                    className="absolute text-gray-500 transform -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    size={20}
                    onClick={() => setSearchQuery("")}
                  />
                )}
              </div>
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex justify-end flex-1">
              <div className="flex gap-4">
                {/* Sort Control */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as
                          | "name"
                          | "price-low"
                          | "price-high"
                          | "rating"
                      )
                    }
                    className="py-3 pl-10 pr-8 text-gray-900 transition-all duration-300 bg-white border border-gray-200 rounded-lg appearance-none dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                  <SortAsc
                    className="absolute text-gray-500 transform -translate-y-1/2 left-3 top-1/2"
                    size={20}
                  />
                </div>

                {/* Filter Button for Mobile */}
                <button
                  className="flex items-center gap-2 px-4 py-3 text-gray-900 bg-white border border-gray-200 rounded-lg md:hidden dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <Filter size={20} />
                  <span>Filters</span>
                </button>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Main Content with Sidebar */}
        <div className="flex flex-col gap-8 md:flex-row">
          {/* Products Grid */}
          <div className="md:w-full">
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Showing {filteredProducts.length} of {products.length} products
              </p>
            </div>
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center bg-white shadow-md dark:bg-gray-800 rounded-xl">
                <div className="mb-4 text-6xl">🥛</div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                  No products found
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
