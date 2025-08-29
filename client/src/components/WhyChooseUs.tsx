import { motion } from 'framer-motion';
import { 
  Leaf, 
  Shield, 
  Clock, 
  Heart, 
  FlaskConical, 
  TruckIcon 
} from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const benefits = [
  {
    icon: Leaf,
    title: '100% Natural',
    description: 'No artificial preservatives, colors, or additives. Pure as nature intended.',
    color: 'green'
  },
  {
    icon: Shield,
    title: 'No Preservatives',
    description: 'Fresh products delivered daily without any chemical preservatives.',
    color: 'blue'
  },
  {
    icon: Clock,
    title: 'Fresh Daily',
    description: 'Milked fresh every morning and delivered the same day to ensure freshness.',
    color: 'yellow'
  },
  {
    icon: Heart,
    title: 'Ethically Sourced',
    description: 'Our cows are raised with love in natural, stress-free environments.',
    color: 'red'
  },
  {
    icon: FlaskConical,
    title: 'Antibiotic-Free',
    description: 'Our milk is guaranteed free from antibiotics and harmful residues.',
    color: 'purple'
  },
  {
    icon: TruckIcon,
    title: 'Farm to Table',
    description: 'Direct delivery from our farm ensures the shortest supply chain possible.',
    color: 'indigo'
  }
];

const colorMap: Record<string, { bg: string; icon: string; border: string; shadow: string }> = {
  green: {
    bg: 'bg-gradient-to-br from-green-400/80 to-green-600/80',
    icon: 'text-white',
    border: 'border-green-400',
    shadow: 'shadow-green-400/40'
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-400/80 to-blue-600/80',
    icon: 'text-white',
    border: 'border-blue-400',
    shadow: 'shadow-blue-400/40'
  },
  yellow: {
    bg: 'bg-gradient-to-br from-yellow-300/80 to-yellow-500/80',
    icon: 'text-yellow-900',
    border: 'border-yellow-400',
    shadow: 'shadow-yellow-400/40'
  },
  red: {
    bg: 'bg-gradient-to-br from-red-400/80 to-red-600/80',
    icon: 'text-white',
    border: 'border-red-400',
    shadow: 'shadow-red-400/40'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-400/80 to-purple-600/80',
    icon: 'text-white',
    border: 'border-purple-400',
    shadow: 'shadow-purple-400/40'
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-400/80 to-indigo-600/80',
    icon: 'text-white',
    border: 'border-indigo-400',
    shadow: 'shadow-indigo-400/40'
  }
};

export default function WhyChooseUs() {
  return (
    <section id="why-choose" className="py-20 dark:bg-[#242424]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-4xl font-bold dark:text-white mb-4">
            Why Choose Legends Milk Cart?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're committed to providing the highest quality dairy products with complete transparency 
            and care for both our customers and our animals.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <AnimatedSection 
              key={index}
              animation="scaleIn"
              delay={index * 0.1}
            >
              <motion.div 
                className={`relative p-8 rounded-2xl border-2 ${colorMap[benefit.color].border} ${colorMap[benefit.color].bg} ${colorMap[benefit.color].shadow} shadow-xl hover:brightness-110 hover:scale-105 transition-all duration-300 min-h-[260px] flex flex-col justify-center`}
                whileHover={{ y: -8, scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 mx-auto bg-white/10 backdrop-blur-md border-2 ${colorMap[benefit.color].border}`}>
                  <benefit.icon className={`w-12 h-12 ${colorMap[benefit.color].icon}`} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 text-center">
                  {benefit.title}
                </h3>
                <p className="text-white/90 text-center leading-relaxed">
                  {benefit.description}
                </p>
                <div className={`absolute -inset-1 rounded-2xl pointer-events-none border-4 ${colorMap[benefit.color].border} opacity-30 blur-lg`}></div>
              </motion.div>
            </AnimatedSection>
          ))}
        </div>

        {/* <AnimatedSection className="mt-16 text-center" delay={0.6}>
          <motion.div 
            className="relative bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-600 rounded-3xl shadow-2xl p-10 max-w-4xl mx-auto  flex flex-col items-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute -inset-1 rounded-3xl pointer-events-none border-4 border-blue-400 opacity-20 blur-lg"></div>
            <h3 className="text-3xl font-extrabold dark:text-white text-black mb-4 drop-shadow-lg">
              Our Quality Promise
            </h3>
            <p className="text-xl  dark:text-white text-black mb-8 font-medium max-w-3xl mx-auto">
              Every product that leaves our farm carries our family's reputation. We guarantee the highest standards of quality, freshness, and purity.
            </p>
            <div className="flex flex-wrap justify-center gap-4 ">
              <span className="bg-green-700 text-white px-6 py-2 rounded-full font-semibold shadow-green-400/30 shadow-md text-lg">
                FSSAI Certified
              </span>
              <span className="bg-blue-700 text-white px-6 py-2 rounded-full font-semibold shadow-blue-400/30 shadow-md text-lg">
                ISO 22000
              </span>
              <span className="bg-purple-700 text-white px-6 py-2 rounded-full font-semibold shadow-purple-400/30 shadow-md text-lg">
                Organic Certified
              </span>
              <span className="bg-yellow-600 text-white px-6 py-2 rounded-full font-semibold shadow-yellow-400/30 shadow-md text-lg">
                Lab Tested Daily
              </span>
            </div>
          </motion.div>
        </AnimatedSection> */}
      </div>
    </section>
  );
}