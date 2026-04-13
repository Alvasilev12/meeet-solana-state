import { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageWrapperProps {
  children: ReactNode;
  withOrbs?: boolean;
}

/** Wraps page content with smooth fade-in + slide-up animation */
const PageWrapper = ({ children, withOrbs = false }: PageWrapperProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className={withOrbs ? "gradient-orbs" : undefined}
  >
    {children}
  </motion.div>
);

export default PageWrapper;
