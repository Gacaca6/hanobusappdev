import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bus, MapPin, Clock, Bell, ChevronRight } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { TranslationKey } from '../i18n/translations';

interface SlideData {
  icon: typeof Bus;
  color: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
}

const slides: SlideData[] = [
  {
    icon: Bus,
    color: 'bg-blue-500',
    titleKey: 'trackBusesLive',
    descKey: 'trackBusesDesc',
  },
  {
    icon: MapPin,
    color: 'bg-green-500',
    titleKey: 'planYourTrip',
    descKey: 'planTripDesc',
  },
  {
    icon: Clock,
    color: 'bg-purple-500',
    titleKey: 'getAccurateETAs',
    descKey: 'getETAsDesc',
  },
  {
    icon: Bell,
    color: 'bg-orange-500',
    titleKey: 'stayInformed',
    descKey: 'stayInformedDesc',
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useTranslation();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col" style={{ height: '100dvh' }}>
      {/* Skip button */}
      <div className="flex justify-end p-4">
        {!isLast && (
          <button
            onClick={handleSkip}
            className="text-gray-400 text-sm font-medium px-4 py-2 hover:text-gray-600 transition-colors"
          >
            {t('skip')}
          </button>
        )}
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <div className={`w-24 h-24 ${slide.color} rounded-3xl flex items-center justify-center mb-8 shadow-lg`}>
              <Icon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">{t(slide.titleKey)}</h2>
            <p className="text-gray-500 text-base leading-relaxed max-w-xs">{t(slide.descKey)}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom section */}
      <div className="px-8 pb-8 shrink-0">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Action button */}
        <button
          onClick={handleNext}
          className="w-full py-4 bg-blue-600 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30"
        >
          {isLast ? t('getStarted') : t('next')}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
