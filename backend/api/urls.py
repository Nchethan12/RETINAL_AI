"""
URL configuration for api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path

from .views import api_root, analyze_retina, sample_cases, analyze_anterior_selfie


urlpatterns = [
    path(
        "",
        api_root,
        name="api-root",
    ),
    path(
        "analyze/",
        analyze_retina,
        name="analyze-retina",
    ),
    path(
        "analyze-selfie/",
        analyze_anterior_selfie,
        name="analyze-anterior-selfie",
    ),
    path(
        "sample-cases/",
        sample_cases,
        name="sample-cases",
    ),
]
