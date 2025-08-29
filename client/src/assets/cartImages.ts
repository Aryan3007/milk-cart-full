import buffaloGhee from './cartImages/image1_BuffaloGhee.png';
import legendsBuffaloMilk from './cartImages/image2_legendsBuffaloMilk.png';
import butterMilk from './cartImages/image3_ButterMilk.png';
import curd from './cartImages/image4_curd.png';
import legendsCowMilk from './cartImages/image5_legendsCowMilk.png';
import sweetLassi from './cartImages/image6_sweetLassi.png';
import paneer from './cartImages/image7_panner.png';
import chocklateMilk from './cartImages/image8_choclateMilk.png'
import membershipMilk from './cartImages/image9_membershipMilk.png';

// 👇 Export them individually
export {
  membershipMilk,
  chocklateMilk,
  buffaloGhee,
  legendsBuffaloMilk,
  butterMilk,
  curd,
  legendsCowMilk,
  sweetLassi,
  paneer,
};

// 👇 Also export grouped if needed
export const cartImages = {
  membershipMilk,
  chocklateMilk,
  paneer,
  buffaloGhee,
  legendsBuffaloMilk,
  butterMilk,
  curd,
  legendsCowMilk,
  sweetLassi,
} as const;

export type CartImageKey = keyof typeof cartImages;
export type CartImagePath = (typeof cartImages)[CartImageKey];
