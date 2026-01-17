// public/js/posterTemplates.js - NEO-BRUTALISM EDITION

const templates = {

    // =====================================================================
    // TEMPLATE 1: THE "DATA SHEET" (Clean Grid, Raw Technical Look)
    // =====================================================================
    modern: (data) => `
        <div class="h-full flex flex-col bg-[#f0f0f0] font-sans border-[4px] border-black overflow-hidden p-2">
            <div class="flex justify-between items-center border-b-[4px] border-black pb-2 mb-2 font-mono text-xs uppercase">
                <span class="bg-black text-white px-2 py-1">EVENT_ID: #2026</span>
                <span class="font-bold tracking-widest">HOST: ${data.hosted_by}</span>
            </div>

            <div class="h-[45%] w-full border-[4px] border-black mb-4 overflow-hidden relative">
                 <div class="absolute inset-0 bg-black/10 z-10 mix-blend-overlay"></div>
                <img src="${data.image}" class="w-full h-full object-cover grayscale contrast-125">
            </div>
            
            <div class="bg-white border-[4px] border-black p-4 shadow-[6px_6px_0px_0px_#000] mb-4 relative z-20">
                <h1 class="text-4xl font-black uppercase leading-[0.9] tracking-tight text-black mb-2 font-oswald break-words">
                    ${data.title}
                </h1>
                 <p class="text-sm font-bold uppercase border-l-[6px] pl-2" style="border-color: ${data.color}">
                    ${data.sub_title}
                </p>
            </div>
            
            <div class="flex-1 grid grid-cols-2 gap-2 font-mono">
                <div class="bg-black text-white p-3 border-[4px] border-black flex flex-col justify-center">
                     <span class="text-[10px] uppercase tracking-widest text-gray-300 mb-1">>> LOCATION</span>
                     <p class="text-lg font-bold uppercase leading-tight break-words">${data.venue}</p>
                </div>
                <div class="p-3 border-[4px] border-black flex flex-col justify-center text-black shadow-[4px_4px_0px_0px_#000]" 
                     style="background-color: ${data.color}">
                      <span class="text-[10px] uppercase tracking-widest opacity-70 mb-1">>> DATE</span>
                     <p class="text-xl font-black uppercase leading-none">${data.date}</p>
                </div>
            </div>
        </div>
    `,

    // =====================================================================
    // TEMPLATE 2: THE "PROPAGANDA" BLOCK (Aggressive layers, Rotated elements)
    // =====================================================================
    bold: (data) => `
        <div class="h-full flex flex-col bg-stone-200 font-sans border-[5px] border-black relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-[70%] z-0 border-b-[5px] border-black" 
                     style="background-color: ${data.color}">
            </div>

            <div class="relative z-10 h-full flex flex-col p-4">
                <div class="bg-black text-white py-1 px-2 font-mono text-xs uppercase tracking-widest border-[3px] border-black mb-4 inline-block w-fit shadow-[4px_4px_0px_0px_#ffffff]">
                     HOST: ${data.hosted_by} //
                </div>

                <div class="h-[40%] w-full border-[4px] border-black shadow-[8px_8px_0px_0px_#000] overflow-hidden bg-black relative mb-6 transform rotate-1">
                     <img src="${data.image}" class="w-full h-full object-cover grayscale brightness-90 contrast-150">
                 </div>

                <div class="bg-white border-[4px] border-black p-5 shadow-[10px_10px_0px_0px_#000] transform -rotate-2 mt-[-60px] relative z-30">
                    <h1 class="text-5xl font-black uppercase leading-[0.85] tracking-tight text-black mb-3 break-words font-oswald">
                        ${data.title}
                    </h1>
                    <p class="font-mono text-sm bg-black text-white inline-block px-2 py-1 font-bold uppercase transform rotate-1">
                        > ${data.sub_title}
                    </p>
                </div>

                 <div class="mt-auto flex justify-end">
                     <div class="bg-white border-[4px] border-black p-4 shadow-[6px_6px_0px_0px_#000] text-center font-mono transform rotate-1">
                          <p class="text-2xl font-black uppercase leading-none mb-1">${data.date}</p>
                          <div class="h-[4px] w-full bg-black my-1"></div>
                          <p class="text-sm font-bold uppercase leading-tight truncate max-w-[150px]">${data.venue}</p>
                     </div>
                 </div>
            </div>
        </div>
    `,

// =====================================================================
    // TEMPLATE 3: THE "TERMINAL" (Clean Version - No Text Shadows)
    // =====================================================================
    hackathon: (data) => `
        <div class="h-full w-full flex flex-col relative bg-black border-[5px] border-black overflow-hidden font-mono">
            <div class="absolute inset-0 z-50 pointer-events-none" style="background-image: linear-gradient(transparent 2px, rgba(0, 0, 0, 0.3) 2px); background-size: 4px 4px; opacity: 0.2;"></div>
            
            <div class="shrink-0 bg-black text-black p-2 border-b-[4px] border-black flex items-center font-bold text-sm uppercase tracking-widest relative z-20"
                 style="background-color: ${data.color}; box-shadow: inset 0 -4px 0 0 rgba(0,0,0,0.5)">
                 <span class="mr-2">[WARNING]</span> SYSTEM_EVENT // HOST: ${data.hosted_by}
            </div>

            <div class="flex-1 flex flex-col min-h-0 relative z-10">
                
                <div class="flex-1 relative w-full border-b-[4px] border-dashed border-white/20 overflow-hidden min-h-[100px]">
                     <div class="absolute inset-0 z-10 mix-blend-multiply opacity-70" style="background-color: ${data.color}"></div>
                    <img src="${data.image}" class="w-full h-full object-cover grayscale opacity-80">
                </div>

                <div class="shrink-0 p-6 pb-4 relative bg-black">
                    <h1 class="text-4xl md:text-5xl font-black text-white uppercase leading-[0.9] tracking-tighter font-oswald break-words mb-4">
                        ${data.title}
                    </h1>
                    
                    <div class="inline-block border-[2px] border-white px-3 py-1 text-white bg-white/10 backdrop-blur-sm text-sm">
                         <span style="color: ${data.color}">>_</span> ${data.sub_title}
                    </div>
                </div>
            </div>

            <div class="shrink-0 bg-white text-black p-4 border-t-[5px] border-black font-bold grid grid-cols-2 gap-4 relative z-30 shadow-[0_-6px_0px_0px_rgba(0,0,0,1)]">
                <div>
                    <p class="text-[10px] uppercase tracking-widest mb-1">WHEN.log</p>
                    <p class="text-lg font-black uppercase leading-none truncate">${data.date}</p>
                </div>
                <div class="border-l-[4px] border-black pl-4">
                    <p class="text-[10px] uppercase tracking-widest mb-1">WHERE.log</p>
                    <p class="text-lg font-black uppercase leading-tight truncate">${data.venue}</p>
                </div>
            </div>
        </div>
    `

    
};

window.posterTemplates = templates;