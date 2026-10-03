import React, { useRef, useEffect } from 'react';
import Icon from '../common/Icon';
import { useLanguage } from '../../context/LanguageContext';

export default function IsometricArt() {
  const { t } = useLanguage();
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
    }
  }, []);

  return (
    <div className="lp-art" aria-hidden="true">
      <div className="iso">
        <div className="tile blank">
          <div className="face" />
        </div>
        <div className="tile">
          <div className="face">
            <img
              src="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=640&h=640&q=72"
              alt=""
            />
          </div>
        </div>
        <div className="tile">
          <div className="face">
            <video
              ref={videoRef}
              muted
              loop
              playsInline
              autoPlay
              poster="https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=640&h=640&q=72"
            >
              <source
                src="https://videos.pexels.com/video-files/5326954/5326954-hd_1920_1080_30fps.mp4"
                type="video/mp4"
              />
            </video>
          </div>
        </div>
        <div className="tile">
          <div className="face">
            <img
              src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=640&h=640&q=72"
              alt=""
            />
          </div>
        </div>
      </div>

      <div className="chip c1" style={{ left: '34%', top: '4%' }}>
        <span className="name">
          <img
            src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=80&h=80&q=60"
            alt=""
          />
          <span>{t('art.maize', 'Maize Field')}</span>
          <Icon name="pin" className="ico sm" />
        </span>
        <span className="row">
          <span className="ins">
            <span>{t('art.ai', 'AI insight')}</span>
            <span style={{ color: 'var(--ink)', fontSize: '14px', fontFamily: 'var(--font)' }}>
              {t('art.ins1', 'Tasseling — watch for armyworm')}
            </span>
          </span>
          <span className="yl">
            28 q/acre
            <span>{t('art.avg', 'avg yield')}</span>
          </span>
        </span>
      </div>

      <div className="chip c2" style={{ left: '44%', top: '60%' }}>
        <span className="name">
          <img
            src="https://images.unsplash.com/photo-1530507629858-e4977d30e9e0?auto=format&fit=crop&w=80&h=80&q=60"
            alt=""
          />
          <span>{t('art.paddy', 'Paddy Field')}</span>
          <Icon name="pin" className="ico sm" />
        </span>
        <span className="row">
          <span className="ins">
            <span>{t('art.ai', 'AI insight')}</span>
            <span style={{ color: 'var(--ink)', fontSize: '14px', fontFamily: 'var(--font)' }}>
              {t('art.ins2', 'Rain on Sunday — hold urea')}
            </span>
          </span>
          <span className="yl w">
            24 q/acre
            <span>{t('art.avg', 'avg yield')}</span>
          </span>
        </span>
      </div>
    </div>
  );
}
