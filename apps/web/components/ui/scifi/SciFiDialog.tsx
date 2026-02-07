import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { 
  Dialog, 
  DialogPortal, 
  DialogOverlay, 
  DialogTrigger,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog"
import { GlassPanel } from "./GlassPanel"
import { ThemeColor } from "@/lib/design-system/types"
import { THEME_HEX, getThemeTextClass } from "@/lib/design-system/themeUtils"

interface SciFiDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  description?: string;
  theme?: ThemeColor;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

interface SciFiDialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export function SciFiDialog({
  open,
  onOpenChange,
  title,
  description,
  theme = 'cyan',
  children,
  footer,
  className,
}: SciFiDialogProps) {
  const themeHex = THEME_HEX[theme];
  const titleColorClass = getThemeTextClass(theme, 400);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-md" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            className
          )}
        >
          <GlassPanel 
            theme={theme} 
            variant="bordered" 
            glow 
            className="w-full relative overflow-visible shadow-2xl"
          >
            <DialogPrimitive.Close 
              className={cn(
                "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50",
                `hover:text-${theme}-400 hover:drop-shadow-[0_0_8px_${themeHex}80]`
              )}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>

            <div className="p-6 grid gap-4">
              {(title || description) && (
                <DialogHeader>
                  {title && (
                    <DialogTitle 
                      className={cn(
                        "font-['Orbitron'] tracking-wider text-xl md:text-2xl",
                        titleColorClass,
                        "drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                      )}
                      style={{
                        textShadow: `0 0 20px ${themeHex}40`
                      }}
                    >
                      {title}
                    </DialogTitle>
                  )}
                  {description && (
                    <DialogDescription className="text-muted-foreground/80 font-['Inter']">
                      {description}
                    </DialogDescription>
                  )}
                </DialogHeader>
              )}
              
              <div className="text-foreground">
                {children}
              </div>

              {footer && (
                <DialogFooter className="mt-2">
                  {footer}
                </DialogFooter>
              )}
            </div>
          </GlassPanel>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

export function SciFiDialogTrigger({ children, asChild }: SciFiDialogTriggerProps) {
  return <DialogTrigger asChild={asChild}>{children}</DialogTrigger>
}

// Export parts for composition if needed
export {
  DialogHeader as SciFiDialogHeader,
  DialogFooter as SciFiDialogFooter,
  DialogTitle as SciFiDialogTitle,
  DialogDescription as SciFiDialogDescription,
}
