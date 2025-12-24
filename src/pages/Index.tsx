import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Users, BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const features = [
    {
      icon: Palette,
      title: 'Graphic Novel Builder',
      description: 'Create stunning comic book pages with panels, characters, and layouts.',
      href: '/graphic-novel-builder',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20'
    },
    {
      icon: Users,
      title: 'Character Assets',
      description: 'Manage your character library with reference images and consistent generation.',
      href: '/assets',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
      icon: BookOpen,
      title: 'Digital Storybooks',
      description: 'View and organize your completed graphic novel pages in collections.',
      href: '/saved-pages',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Welcome to GN Studio
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Your creative workspace for building graphic novels and managing assets.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link key={index} to={feature.href} className="group">
                <Card className="h-full hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors flex items-center justify-between">
                      {feature.title}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;