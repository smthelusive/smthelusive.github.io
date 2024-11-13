---
layout: page
permalink: /comics/
---

<style>
.title {
    color: #ECECEB;
    font-family: 'Comic Sans MS', 'Comic Sans', sans-serif;
    font-size: 30px;
    background: rgba(0, 0, 0, 0);
    cursor: pointer;
    position: absolute;
    bottom: 0pt;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 1%;
    margin-top: auto;
    padding: 10px;
    text-align: center;  
    text-shadow: 5px 5px 15px rgba(0, 0, 0, 1);
}

.image {
    object-fit: cover;
    height: auto;
    transition: transform 0.3s ease;
    filter: brightness(90%);
}

.container:hover .image {
    transform: scale(1.02);
filter: brightness(100%);
}

.container {
    width: 400pt;
    position: relative;
    margin: 0 auto;
    margin-bottom: 30px;
}
</style>

<div>
  <div class="container">
    <a style="text-decoration:none;" href="/comics/awesome_testing">
        <img src="/assets/images/awesome_testing/1-1.png" alt="testing" class="image"/>
        <p class="title">Awesome Testing</p>
    </a>
  </div>
</div>

<div>
  <div class="container">
    <a style="text-decoration:none;" href="/comics/debugging_underworld">
        <img src="/assets/images/debugging_underworld/2.png" alt="underworld" class="image"/>
        <p class="title">Debugging Underworld</p>
    </a>
  </div>
</div>