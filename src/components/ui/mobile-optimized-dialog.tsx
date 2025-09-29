import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const MobileOptimizedDialog = DialogPrimitive.Root;

const MobileOptimizedDialogTrigger = DialogPrimitive.Trigger;

const MobileOptimizedDialogPortal = DialogPrimitive.Portal;

const MobileOptimizedDialogClose = DialogPrimitive.Close;

const MobileOptimizedDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
MobileOptimizedDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const MobileOptimizedDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile();

  return (
    <MobileOptimizedDialogPortal>
      <MobileOptimizedDialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          isMobile
            ? "fixed inset-x-4 top-[10%] bottom-[10%] z-50 grid bg-background border shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 rounded-lg overflow-hidden"
            : "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh] overflow-y-auto",
          className
        )}
        {...props}
      >
        <div className={cn(isMobile ? "flex flex-col h-full" : "")}>
          {/* Mobile header with close button */}
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
              <div className="flex-1" />
              <DialogPrimitive.Close className="rounded-full p-2 hover:bg-accent transition-colors touch-manipulation">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
          )}
          
          {/* Content area */}
          <div className={cn(isMobile ? "flex-1 overflow-y-auto p-4" : "", !isMobile ? "gap-4" : "")}>
            {children}
          </div>
          
          {/* Desktop close button */}
          {!isMobile && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-50 p-2 h-8 w-8 flex items-center justify-center touch-manipulation hover:bg-accent">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </div>
      </DialogPrimitive.Content>
    </MobileOptimizedDialogPortal>
  );
});
MobileOptimizedDialogContent.displayName = DialogPrimitive.Content.displayName;

const MobileOptimizedDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
MobileOptimizedDialogHeader.displayName = "MobileOptimizedDialogHeader";

const MobileOptimizedDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 p-4 border-t bg-background",
      className
    )}
    {...props}
  />
);
MobileOptimizedDialogFooter.displayName = "MobileOptimizedDialogFooter";

const MobileOptimizedDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
MobileOptimizedDialogTitle.displayName = DialogPrimitive.Title.displayName;

const MobileOptimizedDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
MobileOptimizedDialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  MobileOptimizedDialog,
  MobileOptimizedDialogPortal,
  MobileOptimizedDialogOverlay,
  MobileOptimizedDialogClose,
  MobileOptimizedDialogTrigger,
  MobileOptimizedDialogContent,
  MobileOptimizedDialogHeader,
  MobileOptimizedDialogFooter,
  MobileOptimizedDialogTitle,
  MobileOptimizedDialogDescription,
};