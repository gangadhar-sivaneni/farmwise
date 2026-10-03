import React, { useRef, useEffect } from 'react';
import Icon from '../common/Icon';
import { useApp } from '../../context/AppContext';

export default function VideoDialog() {
  const { videoModalOpen, setVideoModalOpen } = useApp();
  const dialogRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (videoModalOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [videoModalOpen]);

  const handleClose = () => {
    setVideoModalOpen(false);
  };

  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      handleClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="vdlg"
      id="videoDlg"
      aria-label="Demo video"
      onClick={handleBackdropClick}
      onClose={handleClose}
    >
      <video ref={videoRef} controls playsInline preload="metadata">
        <source src="/videos/farmwise-demo.mp4" type="video/mp4" />
      </video>
      <button
        type="button"
        className="icon-btn"
        onClick={handleClose}
        aria-label="Close video"
      >
        <Icon name="x" className="ico sm" />
      </button>
    </dialog>
  );
}
