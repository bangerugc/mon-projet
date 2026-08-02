import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auto-Captions",
  description: "Sous-titres automatiques : transcris, édite, exporte.",
};

// Garde-fou : certaines EXTENSIONS de navigateur injectent des scripts dans la
// page et lèvent leurs propres erreurs (ex. « Can't find variable: EmptyRanges »).
// Elles n'ont rien à voir avec l'app mais l'overlay d'erreur de Next les affiche
// en plein écran. Ce script s'exécute AVANT le runtime Next (inline dans <head>)
// et neutralise UNIQUEMENT les erreurs provenant d'extensions — jamais celles de
// l'app (filtre étroit : message « EmptyRanges » ou origine *-extension://).
const SUPPRESS_EXTENSION_ERRORS = `
(function () {
  var SCHEMES = ["safari-web-extension://", "chrome-extension://", "moz-extension://"];
  function fromExtension(s) {
    if (!s || typeof s !== "string") return false;
    for (var i = 0; i < SCHEMES.length; i++) if (s.indexOf(SCHEMES[i]) !== -1) return true;
    return false;
  }
  function isExtensionError(message, source, err) {
    if (typeof message === "string" && message.indexOf("EmptyRanges") !== -1) return true;
    return fromExtension(source) || fromExtension(err && err.stack);
  }
  window.addEventListener("error", function (e) {
    if (isExtensionError(e.message, e.filename, e.error)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    var msg = (r && r.message) || (typeof r === "string" ? r : "");
    if (isExtensionError(msg, "", r)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, true);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        {/* Doit s'exécuter avant le runtime Next → inline synchrone dans <head>. */}
        <script dangerouslySetInnerHTML={{ __html: SUPPRESS_EXTENSION_ERRORS }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-bg text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
