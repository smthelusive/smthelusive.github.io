---
layout: page
permalink: /comics/
---

<style>
.title {
    color: #ECECEB;
    font-family: 'QuickSand', 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 30px;
    background: rgba(0, 0, 0, 0.3);
    cursor: pointer;
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 1%;
    text-shadow: 7px 7px 10px rgba(0, 0, 0, 0.5);
}

.image {
    object-fit: cover;
    height: auto; /* Maintains the aspect ratio */
    transition: transform 0.3s ease;
}

.container:hover .image {
    transform: scale(1.05);
}

.container {
    width: 400pt;
    display: flex;
    align-items: center;
    position: relative;
    top: 20px;
    margin: 0 auto;
    margin-bottom: 30px; 
}
</style>

<div>
  <div class="container">
    <a style="text-decoration:none;" href="/comics/awesome_testing">
        <img src="/assets/images/awesome_testing/1-1.png" alt="testing" class="image"/>
        <div class="title">Awesome Testing</div>
    </a>
  </div>
</div>

<div>
  <div class="container">
    <a style="text-decoration:none;" href="/comics/debugging_underworld">
        <img src="/assets/images/debugging_underworld/2.png" alt="underworld" class="image"/>
        <div class="title">Debugging Underworld</div>
    </a>
  </div>
</div>