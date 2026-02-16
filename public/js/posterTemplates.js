// public/js/posterTemplates.js - DYNAMIC COLOR EDITION
// Helper to prevent layout breakage from long titles
const getDynamicTitleSize = (text) => {
    const len = text.length;
    if (len > 40) return 'text-2xl'; // Very long
    if (len > 25) return 'text-3xl'; // Medium-Long
    if (len > 15) return 'text-4xl'; // Medium
    return 'text-6xl';              // Original Bold Size
};


const templates = {
  // =====================================================================
  // TEMPLATE 1: THE "STICKER SLAM" (Modern) - Background Responsive
  // =====================================================================
  modern: (data) => `
        <div class="h-full w-full flex flex-col p-6 font-sans relative overflow-hidden transition-colors duration-500" 
             style="background-color: ${
               data.color
             }; font-family: 'Inter', sans-serif;">
            
            <div class="absolute top-10 -right-10 w-64 h-12 bg-black text-white flex items-center justify-center font-black text-xs uppercase tracking-[0.3em] transform rotate-45 z-0 shadow-xl">
                CAMPUS LIVE • EVENTLY • 
            </div>

            <div class="z-10 h-full flex flex-col">
                <div class="self-start bg-white border-4 border-black p-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-6 transform -rotate-1">
                    <p class="text-[10px] font-black uppercase italic text-black">HOSTED BY: ${
                      data.hosted_by
                    }</p>
                </div>

                <h1 class="${getDynamicTitleSize(data.title)} font-black uppercase leading-[0.8] tracking-tighter text-black mb-8 break-words drop-shadow-[4px_4px_0px_white]">
                    ${data.title}
                </h1>

                <div class="relative mb-10 w-fit max-w-full">
                    <div class="absolute -top-2 -left-2 w-full h-full bg-black"></div>
                    <div class="relative bg-white border-4 border-black p-4 transform translate-x-1 translate-y-1">
                        <p class="text-sm font-bold uppercase leading-tight italic">"${
                          data.sub_title
                        }"</p>
                    </div>
                </div>

                <div class="mt-auto grid grid-cols-5 gap-0 border-4 border-black bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div class="col-span-3 p-4 border-r-4 border-black flex flex-col justify-center min-w-0">
        <p class="text-[10px] font-black uppercase opacity-30 tracking-widest">ACCESS_INFO</p>
        <p class="text-lg font-black uppercase leading-none mt-1 truncate">${
          data.venue
        }</p>
        <p class="text-3xl font-black italic mt-2 text-black">${data.time}</p>
        <p class="text-xs font-bold uppercase tracking-tighter">${
          data.date.split("T")[0]
        }</p>
    </div>
 
    <div class="col-span-2 flex flex-col items-center justify-center bg-white p-2 min-w-0">
        <div class="w-20 h-20 border-4 border-black p-1 bg-white flex items-center justify-center rounded-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            ${
              data.qrCode
                ? `<img src="${data.qrCode}" class="w-full h-full object-contain block" style="filter: none !important;" />`
                : `<div class="w-full h-full bg-gray-200 animate-pulse"></div>`
            }
        </div>
        <p class="text-[8px] font-black mt-1 uppercase tracking-tighter text-black text-center">SCAN TO REGISTER</p>
    </div>
</div>

                </div>

                <div class="mt-6 flex justify-between items-end">
                    <div class="bg-black text-white px-2 py-1 text-[9px] font-black uppercase">
                        COORD: ${data.coordinators || "ROOT_USER"}
                    </div>
                    <p class="text-[10px] font-black uppercase mix-blend-difference text-white">REF: EVENTLY_v2</p>
                </div>
            </div>
        </div>
    `,

  // =====================================================================
  // TEMPLATE 2: THE "RAW CUTOUT" (Bold) - Intense High-Contrast
  // =====================================================================
  bold: (data) => `
        <div class="h-full w-full flex flex-col p-4 transition-all duration-500" style="background-color: ${
          data.color
        }; font-family: 'Oswald', sans-serif;">
            <div class="flex-1 border-[10px] border-black bg-white flex flex-col relative shadow-[15px_15px_0px_0px_rgba(0,0,0,1)]">
                <div class="bg-black text-white p-6 border-b-[10px] border-black">
                    <h1 class="${getDynamicTitleSize(data.title)} font-black uppercase leading-[0.85] italic tracking-tighter text-center">
                        ${data.title}
                    </h1>
                </div>

                <div class="flex-1 p-6 flex flex-col justify-between">
                    <div class="bg-black text-white self-start px-3 py-1 mb-4 transform -rotate-2">
                        <p class="text-xs font-bold uppercase tracking-widest">${
                          data.hosted_by
                        }</p>
                    </div>

                    <div class="border-l-8 border-black pl-4 mb-8">
                        <p class="text-2xl font-black leading-tight uppercase underline decoration-4 decoration-black">${
                          data.sub_title
                        }</p>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div class="border-4 border-black p-4 bg-[#f0f0f0]">
                            <p class="text-4xl font-black italic leading-none">${
                              data.time
                            }</p>
                            <p class="text-lg font-bold uppercase">${
                              data.date.split("T")[0]
                            }</p>
                            <p class="text-xs font-black bg-black text-white inline-block px-1 mt-2 uppercase">${
                              data.venue
                            }</p>
                        </div>
                        <div class="flex flex-col items-center justify-center border-4 border-black p-2">
                             <div class="w-12 h-12 bg-black flex items-center justify-center text-white">
                                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v3h-2v-3zm3 3h3v2h-3v-2zm-3 3h2v3h-2v-3zm3 3h3v2h-3v-2z"/></svg>
                             </div>
                             <p class="text-[9px] font-black uppercase mt-2 text-center">COORDS: ${
                               data.coordinators || "ADMIN"
                             }</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

  // =====================================================================
  // TEMPLATE 3: THE "DATA SHEET" (Updated with Time, Coords, and QR)
  // =====================================================================
  hackathon: (data) => {
    // Extract time specifically for the poster display
    const displayTime = data.date.includes("T")
      ? new Date(data.date).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "10:00 AM";

    return `
        <div class="h-full flex flex-col bg-[#f0f0f0] font-sans border-[4px] border-black overflow-hidden p-2">
            <div class="flex justify-between items-center border-b-[4px] border-black pb-2 mb-2 font-mono text-xs uppercase">
                <span class="bg-black text-white px-2 py-1">EVENT_ID: #2026</span>
                <span class="font-bold tracking-widest">HOST: ${
                  data.hosted_by
                }</span>
            </div>

            <div class="h-[35%] w-full border-[4px] border-black mb-4 overflow-hidden relative">
                 <div class="absolute inset-0 bg-black/10 z-10 mix-blend-overlay"></div>
                <img src="${
                  data.image
                }" class="w-full h-full object-cover grayscale contrast-125">
            </div>
            
            <div class="bg-white border-[4px] border-black p-4 shadow-[6px_6px_0px_0px_#000] mb-4 relative z-20">
                <h1 class="${getDynamicTitleSize(data.title)} font-black uppercase leading-[0.9] tracking-tight text-black mb-2 font-oswald break-words">
                    ${data.title}
                </h1>
                 <p class="text-sm font-bold uppercase border-l-[6px] pl-2" style="border-color: ${
                   data.color
                 }">
                    ${data.sub_title}
                </p>
            </div>
            
            <div class="grid grid-cols-2 gap-2 font-mono mb-2">
                <div class="bg-black text-white p-3 border-[4px] border-black flex flex-col justify-center">
                     <span class="text-[10px] uppercase tracking-widest text-gray-300 mb-1">>> LOCATION</span>
                     <p class="text-base font-bold uppercase leading-tight">${
                       data.venue
                     }</p>
                </div>
                <div class="p-3 border-[4px] border-black flex flex-col justify-center text-black shadow-[4px_4px_0px_0px_#000]" 
                     style="background-color: ${data.color}">
                     <span class="text-[10px] uppercase tracking-widest opacity-70 mb-1">>> TIME & DATE</span>
                     <p class="text-lg font-black uppercase leading-none">${displayTime}</p>
                     <p class="text-xs font-bold mt-1">${
                       data.date.split("T")[0]
                     }</p>
                </div>
            </div>

            <div class="mt-auto flex gap-2 h-24">
                <div class="flex-1 bg-white border-[4px] border-black p-2 flex flex-col justify-center">
                    <span class="text-[9px] font-black uppercase opacity-40 mb-1">COORDINATORS</span>
                    <p class="text-[10px] font-bold leading-tight uppercase">
                        ${data.coordinators || "Evently Team"}
                    </p>
                </div>
                <div class="w-24 bg-white border-[4px] border-black p-1 flex items-center justify-center">
                    <div class="text-[8px] font-black text-center">
                         <svg class="w-8 h-8 mx-auto mb-1" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v3h-2v-3zm3 3h3v2h-3v-2zm-3 3h2v3h-2v-3zm3 3h3v2h-3v-2z"/></svg>
                         SCAN TO JOIN
                    </div>
                </div>
            </div>
        </div>
   `;
  },
};

window.posterTemplates = templates;
