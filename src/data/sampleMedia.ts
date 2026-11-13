import heroStudioImg from '../assets/images/hero_photostrip_studio_1794572311277.jpg';
import sampleKoreanImg from '../assets/images/sample_portrait_korean_1794572312314.jpg';
import sampleY2kImg from '../assets/images/sample_portrait_y2k_1794572313625.jpg';
import sampleCafeImg from '../assets/images/sample_lifestyle_cafe_1794572313648.jpg';

export interface StudioSamplePhoto {
  id: string;
  label: string;
  src: string;
}

export const HERO_STUDIO_IMAGE = heroStudioImg;

export const STUDIO_SAMPLE_PHOTOS: StudioSamplePhoto[] = [
  {
    id: 'sample-korean',
    label: 'Blush Tulip Portrait',
    src: sampleKoreanImg,
  },
  {
    id: 'sample-duo',
    label: 'Pink Ribbon Duo',
    src: heroStudioImg,
  },
  {
    id: 'sample-y2k',
    label: 'Y2K Lavender Shades',
    src: sampleY2kImg,
  },
  {
    id: 'sample-cafe',
    label: 'Strawberry Latte Cafe',
    src: sampleCafeImg,
  },
];
