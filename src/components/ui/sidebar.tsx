"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX, IconPin, IconPinnedOff } from "@tabler/icons-react";
import Link from "next/link";
import Image from "next/image";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
  pinned: boolean;
  setPinned: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const [pinned, setPinned] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate, pinned, setPinned }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate, pinned, setPinned } = useSidebar();
  
  const handleMouseEnter = () => {
    if (!pinned) {
      setOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!pinned) {
      setOpen(false);
    }
  };

  return (
    <>
      <motion.div
        className={cn(
          "h-full px-4 py-2 hidden md:flex md:flex-col bg-white dark:bg-neutral-800 w-[280px] shrink-0 border-r border-neutral-200 dark:border-neutral-700",
          className
        )}
        animate={{
          width: animate ? (open || pinned ? "280px" : "64px") : "280px",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {/* Pin/Unpin Button - dengan reduced margin */}
        <div className="flex justify-end mb-1">
          <motion.button
            onClick={() => setPinned(!pinned)}
            className={cn(
              "p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors",
              (open || pinned) ? "opacity-100" : "opacity-0"
            )}
            animate={{
              opacity: (open || pinned) ? 1 : 0,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {pinned ? (
              <IconPinnedOff className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            ) : (
              <IconPin className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            )}
          </motion.button>
        </div>
        {children}
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "h-16 px-4 py-4 flex flex-row md:hidden items-center justify-between bg-white dark:bg-neutral-800 w-full border-b border-neutral-200 dark:border-neutral-700"
        )}
        {...props}
      >
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 flex items-center justify-center">
              <Image src="/logo.ico" alt="Logo" width={32} height={32} className="object-contain" />
            </div>
            <span className="text-lg font-semibold text-gray-900 dark:text-white">EMS System</span>
          </div>
          <IconMenu2
            className="text-neutral-800 dark:text-neutral-200 w-6 h-6"
            onClick={() => setOpen(!open)}
          />
        </div>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeInOut",
              }}
              className={cn(
                "fixed h-full w-full inset-0 bg-white dark:bg-neutral-900 p-6 z-[100] flex flex-col",
                className
              )}
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <Image src="/logo.ico" alt="Logo" width={32} height={32} className="object-contain" />
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">EMS System</span>
                </div>
                <IconX 
                  className="text-neutral-800 dark:text-neutral-200 w-6 h-6 cursor-pointer"
                  onClick={() => setOpen(!open)}
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  children,
  ...props
}: {
  link: Links;
  className?: string;
  children?: React.ReactNode;
}) => {
  const { open, animate, pinned } = useSidebar();
  const isExpanded = open || pinned;
  
  return (
    <Link
      href={link.href}
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-2 px-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex-shrink-0">
        {link.icon}
      </div>

      <motion.span
        animate={{
          display: animate ? (isExpanded ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (isExpanded ? 1 : 0) : 1,
        }}
        className="text-neutral-700 dark:text-neutral-200 text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
      {children}
    </Link>
  );
};
