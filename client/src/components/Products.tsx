import { useEffect, useState } from 'react';
import AnimatedSection from './AnimatedSection';
// import { cartImages } from '../assets/cartImages';
import ProductCard from './ProductCard';
import { ApiService } from '../services/api';
import { Product } from '../types';
import { Link } from 'react-router-dom';

declare global {
  interface Window {
    selectedProduct?: Product;
  }
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const response = await ApiService.getProducts();
        const apiProducts = response.products || [];
        // Transform API response to match Product type
        const transformedProducts: Product[] = apiProducts.map((apiProduct: unknown) => {
          const p = apiProduct as { id: string; name: string; description: string; price: number; images?: string[]; category: string; stock: number; inStock: boolean };
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            image: p.images?.[0] || '/placeholder.jpg',
            hoverImage: p.images?.[1],
            category: p.category,
            stock: p.stock,
            badges: p.inStock ? ['In Stock'] : ['Out of Stock'],
            rating: 4.5,
            reviews: 0,
            unit: 'piece',
          };
        });
        setProducts(transformedProducts);
      } catch {
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, []);

  return (
    <section id="products" className="py-20 ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Our Premium Products
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            From fresh milk to traditional ghee, discover our range of authentic dairy products
          </p>
        </AnimatedSection>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden animate-pulse h-64"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.slice(0, 6).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
        <div className="flex justify-center mt-8">
          <Link to="/products">
            <button
              className="bg-black text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-gray-800 transition-colors"

            >
              See All Products
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}