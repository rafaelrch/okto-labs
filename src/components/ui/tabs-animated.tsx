"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

type Tab = {
  title: string;
  value: string;
  content?: string | React.ReactNode | any;
};

export const Tabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
  onValueChange,
  defaultValue,
  contentKey,
}: {
  tabs: Tab[];
  containerClassName?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  contentKey?: string | number;
}) => {
  const initialTab = defaultValue 
    ? propTabs.find(t => t.value === defaultValue) || propTabs[0]
    : propTabs[0];
  const [active, setActive] = useState<Tab>(initialTab);
  const [tabs, setTabs] = useState<Tab[]>(propTabs);
  const [animationKey, setAnimationKey] = useState(0);
  const prevTabsRef = useRef(propTabs);
  
  // Detectar mudanças no conteúdo dos tabs e forçar re-animação
  useEffect(() => {
    const tabsChanged = JSON.stringify(prevTabsRef.current.map(t => ({ value: t.value, title: t.title }))) !== 
                        JSON.stringify(propTabs.map(t => ({ value: t.value, title: t.title })));
    
    if (tabsChanged || contentKey !== undefined) {
      setAnimationKey(prev => prev + 1);
      prevTabsRef.current = propTabs;
    }
  }, [propTabs, contentKey]);

  const moveSelectedTabToTop = (idx: number) => {
    const newTabs = [...propTabs];
    const selectedTab = newTabs.splice(idx, 1);
    newTabs.unshift(selectedTab[0]);
    setTabs(newTabs);
    setActive(newTabs[0]);
    if (onValueChange) {
      onValueChange(newTabs[0].value);
    }
  };

  const [hovering, setHovering] = useState(false);

  return (
    <>
      <div
        className={cn(
          "flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full",
          containerClassName
        )}
      >
        {propTabs.map((tab, idx) => (
          <button
            key={tab.title}
            onClick={() => {
              moveSelectedTabToTop(idx);
            }}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className={cn("relative px-4 py-2 rounded-full", tabClassName)}
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {active.value === tab.value && (
              <motion.div
                layoutId="clickedbutton"
                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                className={cn(
                  "absolute inset-0 bg-gray-200 dark:bg-zinc-800 rounded-full ",
                  activeTabClassName
                )}
              />
            )}

            <span className={cn(
              "relative block",
              active.value === tab.value 
                ? activeTabClassName?.includes('bg-primary') && !activeTabClassName?.includes('bg-primary/20')
                  ? "text-white"
                  : "text-primary"
                : "text-black dark:text-white"
            )}>
              {tab.title}
            </span>
          </button>
        ))}
      </div>
      {contentClassName && (
        <FadeInDiv
          key={`fade-${active.value}-${animationKey}-${contentKey || ''}`}
          tabs={tabs}
          active={active}
          hovering={hovering}
          className={cn("mt-10", contentClassName)}
        />
      )}
    </>
  );
};

export const FadeInDiv = ({
  className,
  tabs,
  active,
  hovering,
}: {
  className?: string;
  key?: string;
  tabs: Tab[];
  active: Tab;
  hovering?: boolean;
}) => {
  const isActive = (tab: Tab) => {
    return tab.value === tabs[0].value;
  };
  return (
    <div className="relative w-full h-full">
      {tabs.map((tab, idx) => (
        <motion.div
          key={tab.value}
          layoutId={tab.value}
          initial={isActive(tab) ? { opacity: 0, y: 20 } : false}
          animate={{
            opacity: isActive(tab) ? 1 : (idx < 3 ? 1 - idx * 0.1 : 0),
            y: isActive(tab) ? [0, 40, 0] : 0,
            scale: 1 - idx * 0.1,
          }}
          transition={{
            type: "spring",
            bounce: 0.3,
            duration: 0.6,
          }}
          style={{
            top: hovering ? idx * -50 : 0,
            zIndex: -idx,
          }}
          className={cn("w-full h-full absolute top-0 left-0", className)}
        >
          {tab.content}
        </motion.div>
      ))}
    </div>
  );
};
