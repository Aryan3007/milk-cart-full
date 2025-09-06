import React, { useEffect } from "react";
import Hero from "../components/Hero";
import Products from "../components/Products";
import About from "../components/About";
import WhyChooseUs from "../components/WhyChooseUs";
// import Testimonials from '../components/Testimonials';
import Contact from "../components/Contact";
import Marquee from "../components/Marquee";

const HomePage: React.FC = () => {
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  return (
    <>
      <Hero />
      <Marquee />
      <Products />
      <About />
      <WhyChooseUs />
      {/* <Testimonials /> */}
      <Contact />
    </>
  );
};

export default HomePage;
