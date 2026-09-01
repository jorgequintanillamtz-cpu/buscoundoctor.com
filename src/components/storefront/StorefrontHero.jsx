import React from "react";
import { MessageCircle } from "lucide-react";

export default function StorefrontHero({ name, photo, headline, whatsappLink }) {
  return (
    <div className="flex flex-col items-center text-center pt-12 pb-6 px-4">
      {photo ? (
        <img
          src={photo}
          alt={name}
          className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg mb-4"
        />
      ) : (
        <div className="w-28 h-28 rounded-full bg-blue-100 border-4 border-white shadow-lg mb-4 flex items-center justify-center">
          <span className="text-3xl font-bold text-blue-600">
            {name ? name.charAt(0).toUpperCase() : "?"}
          </span>
        </div>
      )}
      <h1 className="font-heading font-bold text-2xl text-gray-900">{name}</h1>
      {headline && <p className="text-gray-500 mt-1 text-sm">{headline}</p>}
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 w-full max-w-xs flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold py-4 rounded-2xl shadow-lg hover:bg-[#1ebd5a] active:scale-[0.98] transition-all"
      >
        <MessageCircle className="w-5 h-5" />
        Agendar cita por WhatsApp
      </a>
    </div>
  );
}