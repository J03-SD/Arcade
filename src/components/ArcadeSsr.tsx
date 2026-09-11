"use client";

import { useEffect, useState } from "react";

let dismissed = false;

export function dismissArcadeSsr() {
  dismissed = true;
}

export function ArcadeSsr() {
  const [show, setShow] = useState(() => !dismissed);

  useEffect(() => {
    dismissed = true;
    setShow(false);
  }, []);

  if (!show) return null;
  return <div id="arcade-ssr" className="arcade-ssr" aria-hidden="true" />;
}
