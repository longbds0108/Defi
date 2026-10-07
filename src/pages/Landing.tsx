import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import landingHtml from '../landing/landing.html?raw';
import { initLanding } from '../landing/landingInit';

/**
 * Landing page.
 *
 * The original Hedgora landing is a large, self-contained block of markup plus
 * an imperative animation script (ASCII coin canvas, scroll reveals, nav pill,
 * theme switching, route curtain). We preserve it verbatim: the markup is
 * injected and `initLanding()` runs once the nodes are in the DOM.
 *
 * On top of that we wire the `.js-launch` buttons to actually navigate into the
 * app (the original only played the curtain animation).
 */
export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    initLanding();

    const root = rootRef.current;
    if (!root) return;

    const launchButtons = Array.from(root.querySelectorAll<HTMLElement>('.js-launch'));
    const handleLaunch = () => {
      // Let the route-curtain animation play, then enter the app.
      window.setTimeout(() => navigate('/app/dashboard'), 650);
    };
    launchButtons.forEach((btn) => btn.addEventListener('click', handleLaunch));

    return () => {
      launchButtons.forEach((btn) => btn.removeEventListener('click', handleLaunch));
    };
  }, [navigate]);

  return <div ref={rootRef} dangerouslySetInnerHTML={{ __html: landingHtml }} />;
}
