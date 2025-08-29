import { Product } from '../types';
import {
  membershipMilk,
  paneer,
  chocklateMilk,
  buffaloGhee,
  legendsBuffaloMilk,
  butterMilk,
  curd,
  legendsCowMilk,
  sweetLassi
} from '../../src/assets/cartImages'

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Pure Cow Milk',
    description: '100% pure & unprocessed A2 milk from healthy desi cows. Rich in nutrients and perfect for daily consumption.',
    price: 60,
    originalPrice: 70,
    image: legendsCowMilk,
    category: 'milk',
    stock: 50,
    badges: ['A2 Milk', 'Fresh Daily'],
    rating: 4.8,
    reviews: 124,
    unit: 'Litre'
  },
  {
    id: '2',
    name: 'Buffalo Milk',
    description: 'Rich, creamy buffalo milk with higher fat content. Perfect for making sweets and traditional recipes.',
    price: 80,
    originalPrice: 90,
    image: legendsBuffaloMilk,
    category: 'milk',
    stock: 30,
    badges: ['High Fat', 'Premium'],
    rating: 4.7,
    reviews: 89,
    unit: 'Litre'
  },
  {
    id: '3',
    name: 'Fresh Curd',
    description: 'Homemade curd with live probiotics for better digestion. Made fresh daily from pure milk.',
    price: 70,
    image: curd,
    category: 'dairy',
    stock: 25,
    badges: ['Probiotic', 'Homemade'],
    rating: 4.9,
    reviews: 156,
    unit: '500g'
  },
  {
    id: '4',
    name: 'Pure Ghee',
    description: 'Traditional bilona ghee made from A2 cow milk. Rich aroma and authentic taste.',
    price: 600,
    originalPrice: 650,
    image: buffaloGhee,
    category: 'ghee',
    stock: 15,
    badges: ['Bilona Method', 'A2 Ghee'],
    rating: 4.9,
    reviews: 203,
    unit: '500g'
  },
  {
    id: '5',
    name: 'Fresh Paneer',
    description: 'Soft, fresh paneer made daily with pure milk. High in protein and perfect for cooking.',
    price: 120,
    image: paneer,
    category: 'dairy',
    stock: 20,
    badges: ['Made Daily', 'High Protein'],
    rating: 4.6,
    reviews: 78,
    unit: '250g'
  },
  {
    id: '6',
    name: 'Sweet Lassi',
    description: 'Traditional sweet lassi with authentic taste. Refreshing and nutritious drink.',
    price: 40,
    image: sweetLassi,
    category: 'beverages',
    stock: 35,
    badges: ['Traditional', 'Refreshing'],
    rating: 4.5,
    reviews: 92,
    unit: '250ml'
  },
  {
    id: '7',
    name: 'Organic Butter',
    description: 'Fresh organic butter made from pure cream. Perfect for spreading and cooking.',
    price: 180,
    image: butterMilk,
    category: 'dairy',
    stock: 18,
    badges: ['Organic', 'Fresh'],
    rating: 4.7,
    reviews: 67,
    unit: '200g'
  },
  {
    id: '8',
    name: 'Flavored Milk - Chocolate',
    description: 'Delicious chocolate flavored milk made with pure milk and natural cocoa.',
    price: 45,
    image: chocklateMilk,
    category: 'beverages',
    stock: 40,
    badges: ['Natural Flavor', 'Kids Favorite'],
    rating: 4.4,
    reviews: 134,
    unit: '200ml'
  },
 {
  id: '9',
  name: 'Cow Milk 3L Daily',
  description: 'Pure, fresh A2 cow milk delivered daily from local Jaipur farms — no preservatives, no mixing, just natural goodness in every drop.',
  price: 120,
  image: membershipMilk,
  category: 'dairy',
  stock: 100,
  badges: ['100% Natural', 'Preservative-Free', 'Local Farm Fresh'],
  rating: 4.7,
  reviews: 215,
  unit: '3L',
},
];

export const categories = [
  { id: 'all', name: 'All Products', count: mockProducts.length },
  { id: 'milk', name: 'Milk', count: mockProducts.filter(p => p.category === 'milk').length },
  { id: 'dairy', name: 'Dairy Products', count: mockProducts.filter(p => p.category === 'dairy').length },
  { id: 'ghee', name: 'Ghee', count: mockProducts.filter(p => p.category === 'ghee').length },
  { id: 'beverages', name: 'Beverages', count: mockProducts.filter(p => p.category === 'beverages').length }
];

export const mockUser = {
  id: '1',
  name: 'John Doe',
  phone: '+91 98765 43210',
  email: 'john.doe@example.com',
  addresses: [
    {
      id: '1',
      name: 'John Doe',
      phone: '+91 98765 43210',
      addressLine1: '123 Main Street',
      addressLine2: 'Near City Mall',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      isDefault: true
    }
  ]
};