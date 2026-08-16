with open("src/components/Auth/AuthModal.tsx", "r") as f:
    content = f.read()

# Replace header close button
header_btn = """            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>"""
            
new_header_btn = """            {isClosable && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}"""

content = content.replace(header_btn, new_header_btn)

# Replace footer close button
footer = """          {/* Modal Footer */}
          <div className="p-4 bg-[#101827]/80 border-t border-[#00F0FF]/20 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#0A0D14] border border-slate-700 hover:border-slate-500 text-slate-300 rounded-lg text-xs font-mono transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>"""
          
new_footer = """          {/* Modal Footer */}
          {isClosable && (
            <div className="p-4 bg-[#101827]/80 border-t border-[#00F0FF]/20 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-[#0A0D14] border border-slate-700 hover:border-slate-500 text-slate-300 rounded-lg text-xs font-mono transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}"""
          
content = content.replace(footer, new_footer)

with open("src/components/Auth/AuthModal.tsx", "w") as f:
    f.write(content)
