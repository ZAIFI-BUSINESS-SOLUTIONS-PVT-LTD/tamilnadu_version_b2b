import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, UserCheck, Building } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../assets/images/logo.svg';
import logoInverted from '../assets/images/logo-inverted.svg';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/card.jsx';

const LoginOptions = () => {
  const navigate = useNavigate();

  const container = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
  };

  const item = {
    hidden: { y: 8, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.28, ease: 'easeOut' } },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="visible"
        variants={container}
      >
        <motion.div className="flex flex-col items-center mb-4" variants={item}>
          <img src={logo} alt="Inzighted" className="w-24 h-auto dark:hidden" />
          <img src={logoInverted} alt="Inzighted" className="w-24 h-auto hidden dark:block" />
          <p className="text-sm text-muted-foreground mt-2">An AI Powered Learning Journey</p>
        </motion.div>
        <Card className="overflow-hidden">
          <div className="bg-primary p-5 relative">
            <CardHeader className="p-0">
              <motion.div className="flex flex-col items-center text-center" variants={item}>
                <div className="flex items-center mb-2">
                  <CardTitle className="text-primary-foreground text-lg">Welcome back</CardTitle>
                </div>
                <CardDescription className="text-primary-foreground/80 text-sm max-w-xs">
                  Choose how you'd like to continue.
                </CardDescription>
              </motion.div>
            </CardHeader>
          </div>

          <CardContent className="p-6">
            <motion.div className="grid gap-3" variants={item}>
              <Link to="./student/login" className="group block">
                <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-card dark:hover:bg-card transition-colors">
                  <div className="bg-primary/10 p-3 rounded-md">
                    <GraduationCap size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">Student</p>
                    <p className="text-sm text-muted-foreground">Access your evaluated reports</p>
                  </div>
                </div>
              </Link>

              <Link to="./educator/login" className="group block">
                <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-card dark:hover:bg-card transition-colors">
                  <div className="bg-primary/10 p-3 rounded-md">
                    <UserCheck size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">Educator</p>
                    <p className="text-sm text-muted-foreground">Access reports and manage students</p>
                  </div>
                </div>
              </Link>

              <Link to="./institution/login" className="group block">
                <div className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-card dark:hover:bg-card transition-colors">
                  <div className="bg-primary/10 p-3 rounded-md">
                    <Building size={20} className="text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">Institution</p>
                    <p className="text-sm text-muted-foreground">Manage institution and educators</p>
                  </div>
                </div>
              </Link>
            </motion.div>

          </CardContent>

          <div className="bg-muted px-6 py-3 text-center border-t border-border">
            <p className="text-xs text-muted-foreground">Need help? <a href="https://inzighted.com/contact" className="text-primary hover:underline">Contact support</a></p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginOptions;